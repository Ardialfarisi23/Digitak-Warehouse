**P R O D U C T R E Q U I R E M E N T S D O C U M E N T** 

# **Digitak Warehouse Management System** 

D o k u m e n k e b u t u h a n p r o d u k h a s i l r e v e r s e - e n g i n e e r i n g d a r i c o d e b a s e a k t u a l 

B a c k e n d E x p r e s s . j s + P o s t g r e S Q L ( P r i s m a )  ·  F r o n t e n d N e x t . j s ( A p p R o u t e r ) 

|**15**<br>Fitur fungsional (FR)|**184**<br>Endpoint API<br>**37**<br>Model database|**23**<br>Enum database|**25**<br>Halaman frontend|
|---|---|---|---|
|**Versi Dokumen**|1.0 (Reverse-engineered dari codebase)|||
|**Tanggal Dibuat**|13 Oktober 2026|||
|**Status Proyek**|Aktif / In Development|||
|**Bahasa Dokumen**|Bahasa Indonesia (istilah teknis tetap dalam|bahasa Inggris)||
|**Isi Dokumen**|PRD utama (Bab 1 sampai 19), Lampiran A|(Model Data), Lampir|an B (Spesifikasi API)|



Dokumen ini disusun dengan membaca langsung kode sumber (reverse-engineering). Setiap informasi yang tidak dapat dipastikan dari kode ditandai **[TIDAK DITEMUKAN]** atau **[ASUMSI]** ; daftar lengkapnya ada pada halaman Ringkasan Metrik dan Item Terbuka serta Bab 19. 

## **Daftar Isi** 

|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**Ringkasan Metrik dan Item Terbuka**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 3**|
|---|---|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**1. Ringkasan Eksekutif**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 4**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**2. Latar Belakang & Tujuan**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 4**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**3. Target Pengguna & Persona**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 5**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**4. Ruang Lingkup**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 6**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**5. Arsitektur Sistem**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 7**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**6. Struktur Proyek**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 10**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**7. Functional Requirements**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 11**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**8. Alur Pengguna (User Flow)**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 17**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**9. Halaman, Route & Komponen UI**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 21**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**10. Model Data**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 22**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**11. Spesifikasi API**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 24**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**12. Autentikasi & Otorisasi**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 24**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**13. Integrasi Pihak Ketiga**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 26**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**14. Non-Functional Requirements**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 26**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**15. Konfigurasi & Environment**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 27**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**16. Testing & Quality**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 28**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**17. Temuan & Risiko**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 28**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**18. Rekomendasi & Roadmap**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 29**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**19. Lampiran**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 29**|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**Lampiran A: Spesifikasi Model Data**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 32**|
|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .<br>A.1 Diagram Relasi Entitas (ERD)|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 32|
|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .<br>A.2 Daftar Enum Database (23 Enum)|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 34|
|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .<br>A.3 Spesifikasi Detail Entitas (37 Model)|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 42|
|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .**<br>**Lampiran B: Spesifikasi API**|**.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 79**|
|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .<br>B.1 Ringkasan Endpoint per Modul|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 80|
|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .<br>B.2 Daftar Lengkap Endpoint API|.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . 81|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 2 

## **Ringkasan Metrik dan Item Terbuka** 

##### **Ringkasan Metrik Sistem** 

|**Metrik**|**Jumlah**|**Keterangan**|
|---|---|---|
|Fitur Fungsional (FR)|15 fitur utama|FR-001 (Autentikasi) hingga FR-015 (Permintaan BOQ Tambahan)|
|Endpoint API|184 endpoint|Terdaftar pada file routing Express di`backend/src/modules/`(rincian pada<br>Lampiran B)|
|Tabel / Model Database|37 model dan 23<br>enum|Didefinisikan dalam`schema.prisma`(rincian pada Lampiran A)|
|Halaman Frontend|25 rute|Next.js App Router (Admin, Supervisor, Staff, Master Data, dan lainnya); daftar<br>pada Bab 9|



##### **Bagian Bertanda [TIDAK DITEMUKAN]** 

Bagian berikut dicatat secara transparan karena tidak ada konfigurasi atau implementasi eksplisit di kode sumber. 

|**No**|**Bagian / Konteks**|**Rujukan**|**Penjelasan dan Temuan Kode**|
|---|---|---|---|
|1|Catatan Integrasi Email|FR-002 (Bab<br>7), Bab 13|Tidak ditemukan pustaka SMTP atau mailer (nodemailer, sendgrid, dan<br>sejenisnya) di`backend/package.json`. Fungsi`forgotPassword`di<br>`auth.service.js:172`hanya mengembalikan`resetUrl`di respons JSON.|
|2|Pedoman Aksesibilitas<br>Khusus|Bab 14|Tidak ditemukan standar ARIA spesifik atau audit kepatuhan WCAG formal pada<br>komponen antarmuka.|
|3|ESLint dan Prettier di<br>Backend|Bab 16|Tidak ada file`.eslintrc`atau`.prettierrc`pada sisi backend.|
|4|CI/CD Pipeline|Bab 16|Tidak ditemukan folder`.github/workflows/`,`Jenkinsfile`,`gitlab-ci.yml`,<br>maupun konfigurasi pipeline otomatisasi.|
|5|Modul Capacity|Bab 18|Terdapat direktori`backend/src/modules/capacity/`, namun tidak di-mount ke<br>rute`app.js`.|



##### **Bagian Bertanda [ASUMSI]** 

|**ID**|**Asumsi**|**Rujukan**|**Dasar Asumsi dari Kode**|
|---|---|---|---|
|A-001|Reset password belum bisa mandiri melalui<br>email|FR-002,<br>Bab 19|Endpoint`/api/auth/forgot-password`merespons dengan URL<br>token langsung ke client tanpa proses pengiriman email.|
|A-002|Lingkungan operasional saat ini masih<br>tahap development lokal|Bab 19|Semua konfigurasi origin CORS di`app.js:36`dan`.env`hanya<br>menunjuk ke localhost dan 127.0.0.1.|
|A-003|Modul capacity adalah fitur WIP (Work In<br>Progress)|Bab 18,<br>Bab 19|Modul dibuat tetapi belum diintegrasikan ke router aplikasi utama.|
|A-004|Modul Customer bersifat pasif/arsip|Bab 18,<br>Bab 19|Modul terdaftar di backend (`/api/customers`) dan memiliki halaman<br>frontend, tetapi tidak disertakan dalam navigasi sidebar utama<br>(`navigation.ts`).|
|A-005|Metrik keberhasilan bisnis belum<br>diformalkan|Bab 2,<br>Bab 19|Target kuantitatif bisnis (SLO approval, selisih rekonsiliasi) diestimasi<br>berdasarkan batasan alur kerja di kode, bukan dokumen target KPI<br>formal.|
|A-006|Notifikasi in-app bersifat pull-based (polling)|Bab 19|Tidak ditemukan implementasi WebSocket server atau SSE<br>(Server-Sent Events); notifikasi diambil melalui query API berkala.|
|A-007|Cakupan`gudang-scope.middleware.js`<br>ditujukan untuk staf spesifik gudang|Bab 19|Middleware memfilter akses berdasarkan`req.user.role ===`<br>`'staf_gudang'`dan relasi tabel`user_gudang`.|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 3 

### **1. Ringkasan Eksekutif** 

**Digitak Warehouse Management System** adalah aplikasi web internal milik Digitak Studio untuk mengelola seluruh operasional pergudangan material jaringan telekomunikasi. Sistem ini mencakup alur lengkap dari penerimaan barang (inbound), penyimpanan (putaway), pengiriman (outbound), rekonsiliasi hardware lapangan, dan pelaporan audit. 

##### **Masalah yang Diselesaikan** 

|**#**|**Masalah**|**Solusi Sistem**|
|---|---|---|
|1|Pencatatan stok manual yang rawan error|Ledger stok otomatis berbasis Surat Jalan|
|2|Tidak ada visibilitas BOQ vs realisasi distribusi|Modul BOQ dengan tracking per cluster & tiket|
|3|Proses approval tidak terstruktur|Workflow multi-tahap dengan audit log|
|4|Rekonsiliasi hardware lapangan manual|Upload rekonsiliasi via Excel + konfirmasi|
|5|Tidak ada kontrol akses berbasis peran|RBAC tiga level: Admin, Supervisor, Staff|



##### **Nilai Utama** 

- **Traceability penuh:** setiap mutasi stok tercatat di `stok_ledger` dan `audit_log` 

- **Multi-gudang:** mendukung gudang tetap dan gudang dadakan (transit) 

- **Approval workflow:** BOQ, Surat Jalan, dan Return melalui alur persetujuan berjenjang 

- **Export & Laporan:** ekspor Excel dan PDF untuk rekonsiliasi, audit, dan stok 

##### **Status Saat Ini** 

- Backend: **Production-ready** (Express.js + PostgreSQL + Prisma, versi 1.0.0) 

- Frontend: **Aktif dikembangkan** (Next.js 16.3.0, versi 0.1.0) 

- Database: Schema lengkap dengan 37 model/tabel dan 23 enum, sudah ada migrasi Prisma 

- Testing: Unit test ada di beberapa modul kritis (surat-jalan, gudang-scope, dashboard) 

### **2. Latar Belakang & Tujuan** 

##### **Tujuan Bisnis** 

- Meningkatkan akurasi dan efisiensi pencatatan stok material telekomunikasi 

- Memberikan visibilitas real-time antara rencana BOQ dan realisasi distribusi lapangan 

- Meminimalisir kehilangan material dan selisih rekonsiliasi 

##### **Tujuan Produk** 

- Menyediakan satu platform terpusat untuk seluruh operasional gudang 

- Mendukung multi-proyek dan multi-cluster dalam satu sistem 

- Memastikan setiap transaksi material dapat ditelusuri (auditable) 

##### **Metrik Keberhasilan [ASUMSI: tidak didefinisikan eksplisit di kode]** 

- Selisih rekonsiliasi stok <= 1% 

- Waktu proses approval surat jalan < 24 jam 

- Semua mutasi stok terlacak di ledger (100% coverage) 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 4 

### **3. Target Pengguna & Persona** 

##### **Peran Sistem** 

Terdapat tiga peran yang didefinisikan di `backend/prisma/schema.prisma:894` dan dikonfirmasi di `backend/src/middlewares/role.middleware.js:4` : 

|**Kode Backend**|**Kode Frontend**|**Label UI**|
|---|---|---|
|`admin_general`|`admin`|Admin General|
|`supervisor`|`supervisor`|Supervisor|
|`staf_gudang`|`staff`|Staf Gudang|



##### **Persona 1 - Admin General (** `admin_general` **)** 

###### **Kebutuhan:** 

- Mengelola seluruh master data (barang, gudang, pengguna, proyek, dll.) 

- Melihat laporan lengkap dan audit log 

- Mengelola BOQ dan rekonsiliasi hardware 

- Akses penuh ke semua fitur 

###### **Hak Akses (berdasarkan route):** 

- CRUD penuh: master data (warehouses, aisles, categories, items, personnels, projects, suppliers, units, vehicles, zones, clusters) 

- Membuat & mengubah BOQ, Surat Jalan 

- Melihat laporan stok, audit log, rekonsiliasi 

- Manajemen pengguna (create/update/deactivate) 

- Menerima export Excel/PDF 

##### **Persona 2 - Supervisor (** `supervisor` **) Kebutuhan:** 

- Menyetujui atau menolak Surat Jalan outbound 

- Memantau utilisasi gudang dan zona 

- Melihat data operasional tim 

- Mengelola rekonsiliasi lapangan 

- Melakukan konfirmasi distribusi barang 

###### **Hak Akses (berdasarkan route):** 

- Approval: outbound surat jalan, return transaction 

- Membuat BOQ (bersama Admin) 

- Memperbarui status utilisasi zona ( `/api/zones/:zona_id/utilization-status` ) 

- Melihat antrian approval dan riwayat 

- Akses rekonsiliasi dan remains note 

- Upload file rekonsiliasi Excel 

##### **Persona 3 - Staf Gudang (** `staf_gudang` **)** 

###### **Kebutuhan:** 

- Menerima barang masuk (inbound) 

- Melakukan putaway ke zona/rak 

- Memproses picking outbound 

- Mencatat transit gudang dadakan 

- Melihat riwayat transaksi pribadi 

###### **Hak Akses (berdasarkan route):** 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 5 

- Membuat inbound surat jalan ( `POST /api/surat-jalan/inbound/staff` ) 

- Menerima inbound ( `POST /api/surat-jalan/:id/receive-inbound` ) 

- Putaway ( `POST /api/surat-jalan/:id/putaway` ) 

- Retrieve/picking barang 

- Transit tiba & lanjut ( `POST /api/surat-jalan/:id/transit/tiba|lanjut` ) 

- Upload foto item ( `POST /api/surat-jalan/:id/items/:itemId/fotos` ) 

- Melihat history pribadi ( `GET /api/surat-jalan/staff/history` ) 

### **4. Ruang Lingkup** 

##### **In-Scope (fitur yang ada di kode)** 

|**Modul**|**Keterangan**|
|---|---|
|Autentikasi & Otorisasi|Login JWT, refresh token, forgot/reset password, change password|
|Master Data|Gudang, zona, aisle, kategori, barang, satuan, supplier, kendaraan, personil, proyek, cluster, titik<br>lapangan|
|BOQ (Bill of Quantity)|CRUD BOQ, item BOQ, status workflow, verifikasi eksternal, export Excel/matrix|
|Permintaan BOQ|Pengajuan bottom-up oleh tim lapangan, review & approval|
|Surat Jalan|Inbound & outbound dengan workflow multi-status, transit gudang dadakan|
|Stok Gudang|Ledger stok otomatis, tracking per zona/kondisi/proyek|
|Putaway & Retrieval|Penempatan barang ke zona & pengambilan stok|
|Rekonsiliasi|Upload Excel laporan mitra, konfirmasi, remains note|
|Laporan & Audit|Riwayat stok, audit log, zone utilization, hardware reconciliation|
|Return Material|Pengajuan, approval, penerimaan return dari lapangan|
|Additional Adjustment|Penyesuaian stok manual by Admin/Supervisor|
|Notifikasi|Sistem notifikasi in-app per role|
|Manajemen Pengguna|CRUD user account, assignment gudang|
|Profil & Pengaturan|Update profil, ganti avatar, preferensi notifikasi|
|Dashboard|KPI summary, project summary, approval queue, warehouse assessment|
|Upload File|Upload gambar (item foto), file BOQ reference, rekonsiliasi Excel|



##### **Out-of-Scope (tidak ada di kode)** 

- Integrasi dengan sistem ERP/SAP eksternal 

- Fitur mobile native (Android/iOS app) 

- Manajemen pengiriman pihak ketiga (3PL integration) 

- Invoice & billing 

- Sistem email/notifikasi push (hanya in-app) 

- Barcode/QR scanning (tidak ditemukan implementasinya) 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 6 

### **5. Arsitektur Sistem** 

##### **Tech Stack** 

###### **Frontend** 

|**Komponen**|**Teknologi**|**Versi**|
|---|---|---|
|Framework|Next.js (App Router)|16.3.0|
|Bahasa|TypeScript|^5|
|UI Library|Tailwind CSS|^4|
|Component Library|shadcn/ui|^4.16.1|
|State Management|React Context + SWR + TanStack Query|SWR ^2.5.1, Query ^5.101.4|
|HTTP Client|Axios|^1.19.0|
|Form Handling|React Hook Form + Zod|^7.84.0 + ^4.4.3|
|PDF Generator|@react-pdf/renderer + react-pdf|^4.6.0 + ^10.5.0|
|Excel Export|ExcelJS|^4.4.0|
|Icon Library|Lucide React|^1.30.0|
|Image Crop|react-easy-crop|^6.2.3|
|Animasi|tw-animate-css|^1.4.0|



###### **Backend** 

|**Komponen**|**Teknologi**|**Versi**|
|---|---|---|
|Runtime|Node.js|>=18|
|Framework|Express.js|^5.2.1|
|Bahasa|JavaScript (CommonJS)|-|
|ORM|Prisma|^6.16.3|
|Database|PostgreSQL|>=14|
|Database Driver|pg|^8.22.0|
|Autentikasi|jsonwebtoken + bcrypt|^9.0.3 + ^6.0.0|
|Validasi|Zod|^4.4.3|
|File Upload|Multer|^2.2.0|
|Excel Processing|ExcelJS + xlsx|^4.4.0 + ^0.18.5|
|Logging|Morgan|^1.11.0|
|Cookie|cookie-parser|^1.4.7|
|CORS|cors|^2.8.6|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 7 

##### **Diagram Arsitektur** 



<!-- Start of picture text -->
Browser (Client)<br>Next.js 16.3.0<br>(App Router + TypeScript)<br>HTTP REST via Axios<br>Bearer JWT<br>Backend Server (Node.js)<br>Express.js REST API<br>:5000<br>Middlewares<br>(Auth, Role, GudangScope, Static files /uploads/**<br>Validation, Error)<br>Business Modules<br>(28 modul)<br>Multer<br>Database File Storage<br>P. . Local File System<br>ORM 6. /backend/uploads/<br>PostgreSQL >=14<br>digitakwarehouse<br><!-- End of picture text -->

_Gambar 1. Arsitektur sistem_ 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 8 

##### **Alur Data Utama** 



<!-- Start of picture text -->
Browser Nextjs Frontend Express API PostgreSQL<br>Request halaman<br>Cek auth localStorage token<br>GET /api/auth/me dengan Bearer token<br>Query user_account<br>User data<br>success + data<br>Render halaman dengan data<br>Aksi form submit<br>POST/PUT/PATCH endpoint<br>Middleware auth }+ role + validation<br>Prisma transaction<br>Result<br>Response JSON<br>Update UI<br>Browser Nextjs Frontend Express API PostgreSQL<br><!-- End of picture text -->

_Gambar 2. Alur data utama (sequence diagram)_ 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 9 

### **6. Struktur Proyek** 

```
digitak-warehouse/
├── backend/                          # REST API Server
│   ├── prisma/
│   │   ├── schema.prisma             # Schema database (1088 baris, 37 model, 23 enum)
│   │   ├── seed.js                   # Data seed awal
│   │   ├── migrations/               # File migrasi Prisma
│   │   └── seeders/                  # Data seeder tambahan
│   ├── src/
│   │   ├── app.js                    # Setup Express, CORS, routes (app.js)
│   │   ├── server.js                 # Entry point listen port
│   │   ├── config/
│   │   │   ├── env.js                # Environment variable loader
│   │   │   └── prisma.js             # Prisma client singleton
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js    # JWT verify + aktif check
│   │   │   ├── role.middleware.js    # RBAC authorization
│   │   │   ├── gudang-scope.middleware.js  # Scope akses per gudang
│   │   │   ├── validation.middleware.js    # Zod schema validation
│   │   │   ├── error.middleware.js   # Global error handler
│   │   │   └── require-password-change.middleware.js
│   │   ├── modules/                  # 28 business modules
│   │   │   ├── auth/                 # Login, logout, reset password
│   │   │   ├── boq/                  # Bill of Quantity CRUD
│   │   │   ├── cluster/              # Cluster per proyek
│   │   │   ├── surat-jalan/          # MODUL UTAMA: inbound/outbound flow
│   │   │   ├── dashboard/            # KPI & statistik
│   │   │   ├── reports/              # Laporan & audit
│   │   │   ├── reconciliation/       # Rekonsiliasi hardware
│   │   │   ├── permintaan-boq/       # Request BOQ tambahan
│   │   │   ├── return/               # Return material
│   │   │   ├── additional/           # Penyesuaian stok manual
│   │   │   ├── notifications/        # Notifikasi in-app
│   │   │   ├── settings/             # Pengaturan user & notifikasi
│   │   │   ├── users/                # Manajemen akun user
│   │   │   ├── profile/              # Profil pengguna
│   │   │   ├── upload/               # File upload handler
│   │   │   ├── warehouse/            # Master gudang
│   │   │   ├── zone/                 # Zona gudang
│   │   │   ├── aisle/                # Aisle gudang
│   │   │   ├── category/             # Kategori barang
│   │   │   ├── item/                 # Master barang
│   │   │   ├── unit/                 # Satuan barang
│   │   │   ├── supplier/             # Master supplier
│   │   │   ├── customer/             # Master customer
│   │   │   ├── personnel/            # Master personil
│   │   │   ├── vehicle/              # Master kendaraan
│   │   │   ├── projects/             # Master proyek
│   │   │   ├── titik-lapangan/       # Lokasi lapangan
│   │   │   └── capacity/             # Kapasitas gudang [belum di-mount]
│   │   ├── shared/
│   │   │   ├── errors.js             # AppError class
│   │   │   └── password.js           # bcrypt helper
│   │   └── utils/                    # Utility functions
│   ├── uploads/                      # File uploads (foto item, BOQ ref, dll.)
│   └── scripts/
│       └── dev/                      # Development scripts
│
├── frontend/                         # Next.js Web App
│   ├── app/                          # App Router pages
│   │   ├── page.tsx                  # Halaman login (redirect by role)
│   │   ├── layout.tsx                # Root layout + AuthProvider
│   │   ├── dashboard/                # Halaman Admin & Supervisor
│   │   │   ├── layout.tsx            # Sidebar + ProtectedRoute wrapper
│   │   │   ├── page.tsx              # Dashboard Admin
│   │   │   ├── boq/                  # Cluster & BOQ management
│   │   │   ├── delivery/             # Surat Jalan (Admin view)
│   │   │   ├── warehouse/            # Gudang & Layout
│   │   │   ├── reconciliation/       # Rekonsiliasi
│   │   │   ├── reports/              # Laporan & Audit
│   │   │   ├── users/                # Manajemen Pengguna
│   │   │   ├── settings/             # Pengaturan
│   │   │   └── supervisor/           # Area khusus Supervisor
│   │   │       ├── page.tsx          # Dashboard Supervisor
│   │   │       ├── approval/         # Antrian Approval
│   │   │       ├── boq/              # BOQ view Supervisor
│   │   │       ├── warehousespv/     # Utilisasi Gudang
│   │   │       ├── reconciliation/   # Rekonsiliasi Supervisor
│   │   │       └── operasional/      # Data Operasional & Tim
│   │   ├── staff/                    # Halaman Staf Gudang
│   │   │   ├── layout.tsx            # Staff layout + sidebar
│   │   │   ├── dashboard/            # Tugas Saya
│   │   │   ├── inbound/              # Penerimaan barang
```

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 10 

```
│   │   │   ├── outbound/             # Surat Jalan outbound
│   │   │   ├── putaway/              # Lokasi & Rak
│   │   │   └── history/              # Riwayat transaksi
│   │   ├── master-data/              # Master Data (Admin + Supervisor)
│   │   ├── profile/                  # Profil pengguna
│   │   ├── notifications/            # Notifikasi
│   │   ├── forgot-password/          # Lupa password
│   │   └── reset-password/           # Reset password
│   ├── components/                   # Shared UI components
│   │   ├── CompactSidebar.tsx        # Sidebar navigasi utama
│   │   ├── GlobalHeader.tsx          # Header global (notifikasi, avatar)
│   │   ├── ConfirmModal.tsx          # Modal konfirmasi generik
│   │   ├── BarangPicker.tsx          # Komponen pilih barang
│   │   ├── BoqPicker.tsx             # Komponen pilih BOQ
│   │   ├── TablePagination.tsx       # Komponen paginasi tabel
│   │   ├── UserAvatar.tsx            # Avatar pengguna
│   │   ├── WarehouseLayoutMap.tsx    # Peta layout gudang
│   │   ├── PdfViewerComponent.tsx    # PDF viewer
│   │   ├── AccountDeactivatedListener.tsx  # Deteksi akun dinonaktifkan
│   │   ├── ui/                       # shadcn/ui base components
│   │   ├── staff/                    # Komponen khusus staff
│   │   ├── surat-jalan/              # Komponen surat jalan
│   │   └── reconciliation/           # Komponen rekonsiliasi
│   └── lib/
│       ├── api.ts                    # Axios instance + interceptors
│       ├── auth-context.tsx          # AuthContext + useAuth hook
│       ├── navigation.ts             # Konfigurasi navigasi per role
│       ├── protected-route.tsx       # HOC proteksi route
│       ├── permissions.ts            # Utility cek permission
│       └── exportReconciliationXlsx.ts  # Export Excel rekonsiliasi
│
└── docs/                             # Dokumentasi proyek
    ├── PRD.md                        # Dokumen ini
    ├── api-spec.md                   # Spesifikasi API lengkap
    └── data-model.md                 # Model data & ERD
```

### **7. Functional Requirements** 

##### **FR-001 - Autentikasi Pengguna** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-001|
|**Nama**|Login & Session Management|
|**Deskripsi**|Pengguna login dengan email + password. Sistem mengeluarkan JWT access token (24 jam) dan refresh<br>token (7 hari)|
|**User Story**|Sebagai karyawan, saya ingin login ke sistem agar dapat mengakses fitur sesuai peran saya|
|**Acceptance Criteria**|Login berhasil -> redirect ke dashboard sesuai role; Login gagal -> pesan error; Token expired -> auto-refresh<br>atau redirect login|
|**Aturan Bisnis**|Email harus unik; Password di-hash dengan bcrypt; Akun non-aktif tidak bisa login; Pengguna dengan<br>`must_change_password=true`diarahkan ke halaman ganti password|
|**File Terkait**|`backend/src/modules/auth/auth.service.js`,`frontend/lib/auth-context.tsx`|
|**Status**|Selesai|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 11 

##### **FR-002 - Reset Password** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-002|
|**Nama**|Forgot & Reset Password|
|**Deskripsi**|Pengguna memasukkan email, sistem membuat token reset (expire 15 menit), menghasilkan URL reset|
|**User Story**|Sebagai pengguna, saya ingin reset password jika lupa agar bisa kembali mengakses sistem|
|**Aturan Bisnis**|Token disimpan di tabel`password_resets`, expire 15 menit; Reset URL di-generate ke frontend|
|**Catatan**|[ASUMSI: Email tidak dikirimkan secara otomatis -`forgotPassword`service hanya mengembalikan`resetUrl`tanpa<br>memanggil email service]|
|**File Terkait**|`backend/src/modules/auth/auth.service.js:155`,`frontend/app/forgot-password/`,<br>`frontend/app/reset-password/`|
|**Status**|Sebagian - URL reset tidak dikirim via email|



##### **FR-003 - Manajemen Master Data** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-003|
|**Nama**|CRUD Master Data|
|**Deskripsi**|Admin dapat mengelola semua entitas master: gudang, zona, kategori barang, barang, satuan, supplier,<br>kendaraan, personil, proyek, cluster, titik lapangan|
|**User Story**|Sebagai Admin, saya ingin menambah, mengedit, dan menghapus data master agar sistem selalu up-to-date|
|**Acceptance Criteria**|Setiap entitas dapat dibuat, dibaca, diperbarui; Soft-delete tersedia untuk beberapa entitas (BOQ, proyek)|
|**File Terkait**|`frontend/app/master-data/page.tsx`(124 KB),<br>`backend/src/modules/{warehouse,zone,category,item,...}/`|
|**Status**|Selesai|



##### **FR-004 - Manajemen BOQ** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-004|
|**Nama**|Bill of Quantity Management|
|**Deskripsi**|Admin/Supervisor dapat membuat, mengedit, dan mengubah status BOQ per cluster. BOQ berisi daftar barang<br>dengan qty rencana, additional, MOS, dan used|
|**User Story**|Sebagai Admin, saya ingin membuat BOQ untuk setiap cluster agar distribusi material terencana dan terukur|
|**Acceptance Criteria**|BOQ dapat dibuat dengan status`draft`; BOQ dapat diaktifkan dengan tanggal aktivasi; BOQ dapat soft-delete<br>dan restore|
|**Aturan Bisnis**|Status flow:`draft -> aktif -> selesai/ditolak`;`boq_source`:`top_down`atau`bottom_up`;<br>`external_verification_status`:`menunggu/terverifikasi/tidak_berlaku`|
|**File Terkait**|`backend/src/modules/boq/`,`frontend/app/dashboard/boq/`|
|**Status**|Selesai|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 12 

##### **FR-005 - Surat Jalan Inbound** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-005|
|**Nama**|Penerimaan Barang (Inbound)|
|**Deskripsi**|Staf membuat surat jalan inbound untuk mencatat barang yang masuk ke gudang dari supplier/internal.<br>Barang diperiksa dan diterima dengan kondisi|
|**User Story**|Sebagai Staf, saya ingin mencatat barang masuk agar stok gudang selalu akurat|
|**Acceptance Criteria**|Surat jalan dibuat -> status`draft_diajukan`; Barang diterima dengan qty, kondisi, dan foto; Stok ledger<br>diupdate otomatis|
|**Aturan Bisnis**|Kondisi barang:`baik/rusak_ringan/rusak_berat/tidak_sesuai_spek/doa`; Tipe pengirim:<br>`internal/external`|
|**File Terkait**|`backend/src/modules/surat-jalan/surat-jalan.service.js`,`frontend/app/staff/inbound/`|
|**Status**|Selesai|



##### **FR-006 - Surat Jalan Outbound** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-006|
|**Nama**|Pengiriman Barang (Outbound)|
|**Deskripsi**|Admin/Staf membuat surat jalan outbound untuk mengirim material ke lapangan atau cluster tertentu.<br>Membutuhkan approval Supervisor sebelum dikirim|
|**User Story**|Sebagai Admin, saya ingin membuat surat jalan outbound agar pengiriman barang terdokumentasi dan disetujui<br>Supervisor|
|**Acceptance Criteria**|SJ dibuat -> antrian approval -> Supervisor approve ->`disetujui`->`sedang_dikirim`-><br>`tiba_menunggu_konfirmasi`->`diterima_didistribusikan`|
|**Aturan Bisnis**|Kategori approval khusus untuk item kritis, melebihi BOQ, atau di luar BOQ; Picking dilakukan dari stok gudang<br>per zona|
|**File Terkait**|`backend/src/modules/surat-jalan/surat-jalan.routes.js`,`frontend/app/dashboard/delivery/`,<br>`frontend/app/staff/outbound/`|
|**Status**|Selesai|



##### **FR-007 - Putaway & Retrieval** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-007|
|**Nama**|Putaway & Stock Retrieval|
|**Deskripsi**|Setelah barang diterima (inbound), staf melakukan putaway ke zona gudang. Saat outbound, sistem<br>melakukan retrieval/picking dari zona|
|**User Story**|Sebagai Staf, saya ingin menempatkan barang ke zona yang tepat agar lokasi stok selalu terlacak|
|**Acceptance Criteria**|Putaway mencatat zona_id per item; Stok`stok_gudang`diupdate berdasarkan zona; Retrieval mengurangi<br>stok dari zona|
|**File Terkait**|`backend/src/modules/surat-jalan/surat-jalan.routes.js:117-133`,`frontend/app/staff/putaway/`|
|**Status**|Selesai|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 13 

##### **FR-008 - Transit Gudang Dadakan** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-008|
|**Nama**|Checkpoint Gudang Transit|
|**Deskripsi**|Surat jalan outbound dapat melewati gudang transit (tipe`dadakan`) sebelum sampai tujuan akhir. Staf mencatat tiba<br>dan berangkat di setiap checkpoint|
|**User Story**|Sebagai Staf di gudang transit, saya ingin mencatat barang yang singgah agar perjalanan material terlacak|
|**Aturan Bisnis**|Hanya STAFF yang bisa aksi transit; Status:`sedang_dikirim -> tiba_di_transit -> sedang_dikirim ->`<br>`tiba_menunggu_konfirmasi`|
|**File Terkait**|`backend/src/modules/surat-jalan/surat-jalan.routes.js:83-99`, model`surat_jalan_transit`|
|**Status**|Selesai|



##### **FR-009 - Rekonsiliasi Hardware** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-009|
|**Nama**|Upload & Rekonsiliasi Laporan Mitra|
|**Deskripsi**|Admin/Supervisor upload file Excel laporan dari mitra lapangan. Sistem mem-parsing dan menyimpan data<br>rekonsiliasi per tiket dan barang|
|**User Story**|Sebagai Admin, saya ingin mengupload laporan mitra dan melakukan rekonsiliasi agar selisih material<br>lapangan teridentifikasi|
|**Acceptance Criteria**|Upload Excel -> parsing -> preview -> konfirmasi -> data tersimpan di`laporan_mitra`; Export rekonsiliasi<br>tersedia dalam Excel|
|**File Terkait**|`backend/src/modules/reports/reports.routes.js:23-24`,`frontend/lib/exportReconciliationXlsx.ts`,<br>model`laporan_mitra`|
|**Status**|Selesai|



##### **FR-010 - Return Material** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-010|
|**Nama**|Return Transaction|
|**Deskripsi**|Material dari lapangan dapat dikembalikan ke gudang. Return memerlukan pengajuan, approval, dan konfirmasi<br>penerimaan|
|**User Story**|Sebagai Admin, saya ingin mencatat return material dari lapangan agar stok gudang bertambah kembali|
|**Aturan Bisnis**|Status:`draft -> diajukan -> disetujui -> diterima_gudang / ditolak`; Return dikaitkan dengan baseline<br>laporan mitra (`baseline_laporan_id`)|
|**File Terkait**|`backend/src/modules/return/`, model`return_transaction`,`stok_ledger`|
|**Status**|Selesai|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 14 

##### **FR-011 - Laporan & Audit** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-011|
|**Nama**|Laporan Stok & Audit Log|
|**Deskripsi**|Admin dapat melihat dan mengekspor riwayat mutasi stok, log audit seluruh aksi pengguna, riwayat utilisasi<br>zona, dan rekonsiliasi hardware|
|**User Story**|Sebagai Admin, saya ingin melihat semua aktivitas sistem dalam bentuk laporan agar dapat diaudit|
|**Acceptance Criteria**|Laporan dapat difilter; Data dapat diekspor ke Excel; Audit log mencatat semua aksi|
|**File Terkait**|`backend/src/modules/reports/`,`frontend/app/dashboard/reports/page.tsx`(106 KB)|
|**Status**|Selesai|



##### **FR-012 - Manajemen Pengguna** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-012|
|**Nama**|User Management (Admin Only)|
|**Deskripsi**|Admin dapat membuat, melihat, dan mengupdate akun pengguna. Setiap user dapat di-assign ke satu atau<br>beberapa gudang|
|**User Story**|Sebagai Admin, saya ingin mengelola akun karyawan agar hak akses terkontrol|
|**Aturan Bisnis**|User baru mendapatkan`must_change_password=true`; User dapat di-deactivate (`is_aktif=false`); User-Gudang<br>assignment melalui tabel`user_gudang`|
|**File Terkait**|`backend/src/modules/users/`,`frontend/app/dashboard/users/`|
|**Status**|Selesai|



##### **FR-013 - Notifikasi In-App** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-013|
|**Nama**|Sistem Notifikasi|
|**Deskripsi**|Sistem mengirimkan notifikasi in-app kepada pengguna atau role tertentu berdasarkan event|
|**User Story**|Sebagai pengguna, saya ingin menerima notifikasi agar tidak melewatkan aksi penting|
|**Aturan Bisnis**|Notifikasi dapat ditargetkan ke user spesifik (`user_id`) atau seluruh role (`role`); Tipe:<br>`info/approval/warning/success/error`; Preferensi notifikasi tersimpan di`user_notification_preferences`|
|**File Terkait**|`backend/src/modules/notifications/`, model`notification`,`user_notification_preferences`|
|**Status**|Selesai|



##### **FR-014 - Penilaian Utilisasi Zona Gudang** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-014|
|**Nama**|Warehouse Zone Utilization|
|**Deskripsi**|Supervisor/Admin dapat menilai status kecukupan zona gudang: CUKUP, MENDEKATI_PENUH, atau<br>TIDAK_CUKUP|
|**User Story**|Sebagai Supervisor, saya ingin menilai kapasitas zona gudang agar penempatan barang optimal|
|**Aturan Bisnis**|`status_kecukupan_source`: AUTO atau MANUAL; Log perubahan di`zona_utilisasi_log`; Endpoint per-zona:<br>`PATCH /api/zones/:zona_id/utilization-status`|
|**File Terkait**|`backend/src/modules/zone/zone.routes.js:40-46`, model`zona_gudang`,`zona_utilisasi_log`|
|**Status**|Selesai|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 15 

##### **FR-015 - Permintaan BOQ Tambahan** 

|**Atribut**|**Detail**|
|---|---|
|**ID**|FR-015|
|**Nama**|BOQ Additional Request (Bottom-Up)|
|**Deskripsi**|Personil lapangan dapat mengajukan permintaan BOQ tambahan untuk barang yang belum tercakup atau qty-nya<br>kurang|
|**User Story**|Sebagai personil lapangan, saya ingin mengajukan permintaan barang tambahan agar kebutuhan lapangan<br>terpenuhi|
|**Aturan Bisnis**|Status:`diajukan -> ditinjau -> disetujui / ditolak`; Diajukan oleh`personil`(bukan`user`); Ditinjau oleh<br>Supervisor/Admin|
|**File Terkait**|`backend/src/modules/permintaan-boq/`, model`permintaan_boq`|
|**Status**|Selesai|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 16 

**8. Alur Pengguna (User Flow)** 

##### **Alur Login & Routing** 



<!-- Start of picture text -->
Buka Aplikasi<br>Ada token di localStorage?<br>Ya’<br>Validasi ke /api/auth/me Tidak<br>Tidak Valid 401<br>Halaman Login<br>Isi email + password<br>Valid<br>POST /api/auth/login<br>Gagal Sukses<br>Tampilkan error must_change_password?<br>Tidak Ya<br>Halaman Ganti Password<br>admin supervisor staff<br>/dashboard Admin /dashboard/supervisor /staff/dashboard<br><!-- End of picture text -->

_Gambar 3. Alur login dan routing_ 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 17 

**Alur Surat Jalan Inbound (Staff)** 



<!-- Start of picture text -->
Staff buat SJ Inbound<br>POST /api/surat-<br>jalan/inbound/staff<br>Status: draft_diajukan<br>Verifikasi opsional<br>Status: ready_putaway<br>Staff terima barang POST<br>receive-inbound<br>Kondisi OK?<br>Yay Ada penolakan<br>Stok ledger IN terbuat Catat qty_ditolak + alasan<br>Staff putaway ke zona<br>POST putaway<br>stok_gudang diupdate per<br>zona<br><!-- End of picture text -->

_Gambar 4. Alur surat jalan inbound (staf)_ 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 18 

##### **Alur Surat Jalan Outbound** 



<!-- Start of picture text -->
Admin/Staff buat S}<br>Outbound<br>Sistem picking dari stok<br>zona<br>Status: draft_diajukan<br>Supervisor review<br>outbound queue<br>Setuja Tolak<br>PUT approve-outbound PUT reject-outbound<br>Status: disetujui Status: ditolak<br>Status: digenerate +<br>generate PDF<br>Staff mulai kirim<br>Status: sedang_dikirim<br>‘Ada gudang transit?<br>Ya Tidak<br>POST transit/tiba Sal etl)<br>Status: tiba_di_transitfees , Status: -maci<br>tiba_menunggu_konfirmasi<br>POST transit/lanjut Supervisor konfirmasi<br>Status: sedang_dikirim PUT confirm-distributed<br>Status:<br>diterima_didistribusikan<br>Stok ledger OUT terbuat<br><!-- End of picture text -->

_Gambar 5. Alur surat jalan outbound_ 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 19 

##### **Alur Rekonsiliasi Hardware** 



<!-- Start of picture text -->
Admin/Supervisor<br>Download template<br>GET<br>/reports/reconciliation/template<br>Isi data laporan mitra di<br>Excel<br>Upload Excel<br>POST<br>/reports/reconciliation/upload<br>Parsing berhasil?<br>Ada baris gagal Semua sukses<br>Tampilkan detail error Preview hasil upload<br>Konfirmasi tetap lanjut<br>POST<br>/reports/reconciliation/confirm<br>Data tersimpan di<br>laporan_mitra<br>Lihat Rekonsiliasi<br>GET<br>/reconciliation/inventory<br><!-- End of picture text -->

_Gambar 6. Alur rekonsiliasi hardware_ 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 20 

### **9. Halaman, Route & Komponen UI** 

##### **Halaman Frontend (Next.js App Router)** 

|**Path**|**Nama Halaman**|**Role**|**File**|**Data Dimuat**|
|---|---|---|---|---|
|`/`|Login|Public|`app/page.tsx`(14 KB)|-|
|`/forgot-password`|Lupa Password|Public|`app/forgot-password/`|-|
|`/reset-password`|Reset Password|Public|`app/reset-password/`|-|
|`/dashboard`|Dashboard Admin|Admin|`app/dashboard/page.tsx`(21 KB)|KPI, project summary,<br>activities|
|`/dashboard/boq`|Cluster & BOQ|Admin|`app/dashboard/boq/`|BOQ list, stats|
|`/dashboard/delivery`|Surat Jalan Admin|Admin|`app/dashboard/delivery/page.tsx`(40<br>KB)|SJ inbound/outbound|
|`/dashboard/warehouse`|Gudang & Layout|Admin|`app/dashboard/warehouse/page.tsx`<br>(56 KB)|Gudang, zona, utilisasi|
|`/dashboard/reconciliation`|Rekonsiliasi|Admin|`app/dashboard/reconciliation/`|Upload log, inventory|
|`/dashboard/reports`|Laporan & Audit|Admin|`app/dashboard/reports/page.tsx`(106<br>KB)|Stok history, audit log|
|`/dashboard/users`|Manajemen<br>Pengguna|Admin|`app/dashboard/users/`|User list|
|`/dashboard/settings`|Pengaturan|All|`app/dashboard/settings/`|Preferensi notifikasi|
|`/dashboard/supervisor`|Dashboard<br>Supervisor|Supervisor|`app/dashboard/supervisor/dashboard.`<br>`tsx`(24 KB)|KPI supervisor|
|`/dashboard/supervisor/app`<br>`roval`|Antrian Approval|Supervisor|`app/dashboard/supervisor/approval/`|SJ menunggu approval|
|`/dashboard/supervisor/boq`|BOQ Supervisor|Supervisor|`app/dashboard/supervisor/boq/`|BOQ per cluster|
|`/dashboard/supervisor/war`<br>`ehousespv`|Utilisasi Gudang|Supervisor|`app/dashboard/supervisor/warehouses`<br>`pv/`|Zone utilization|
|`/dashboard/supervisor/rec`<br>`onciliation`|Rekonsiliasi &<br>Area|Supervisor|`app/dashboard/supervisor/reconcilia`<br>`tion/`|Rekonsiliasi, remains<br>note|
|`/dashboard/supervisor/ope`<br>`rasional`|Data Operasional<br>& Tim|Supervisor|`app/dashboard/supervisor/operasiona`<br>`l/`|Personil, kendaraan|
|`/master-data`|Master Data|Admin +<br>Supervisor|`app/master-data/page.tsx`(124 KB)|Semua entitas master|
|`/staff/dashboard`|Tugas Saya|Staff|`app/staff/dashboard/`|Tugas aktif staff|
|`/staff/inbound`|Penerimaan|Staff|`app/staff/inbound/`|SJ inbound|
|`/staff/outbound`|Surat Jalan|Staff|`app/staff/outbound/`|SJ outbound|
|`/staff/putaway`|Lokasi & Rak|Staff|`app/staff/putaway/`|Zona gudang, stok|
|`/staff/history`|Riwayat|Staff|`app/staff/history/`|History transaksi|
|`/profile`|Profil|All|`app/profile/`|Data profil, avatar|
|`/notifications`|Notifikasi|All|`app/notifications/`|Daftar notifikasi|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 21 

##### **Komponen UI Utama** 

|**Komponen**|**File**|**Fungsi**|
|---|---|---|
|`CompactSidebar`|`components/CompactSidebar.tsx`(11 KB)|Sidebar collapsible dengan icon & tooltip, filter menu by<br>role|
|`GlobalHeader`|`components/GlobalHeader.tsx`(18 KB)|Header: notifikasi badge, avatar, user menu|
|`ConfirmModal`|`components/ConfirmModal.tsx`|Modal konfirmasi generik|
|`BarangPicker`|`components/BarangPicker.tsx`(8 KB)|Search & select barang dengan autocomplete|
|`BoqPicker`|`components/BoqPicker.tsx`(9 KB)|Search & select BOQ|
|`TablePagination`|`components/TablePagination.tsx`|Paginasi tabel standar|
|`UserAvatar`|`components/UserAvatar.tsx`|Avatar dengan crop & upload|
|`WarehouseLayoutMap`|`components/WarehouseLayoutMap.tsx`|Visual map zona gudang|
|`AccountDeactivatedList`<br>`ener`|`components/AccountDeactivatedListener.tsx`|Deteksi 401 ACCOUNT_DEACTIVATED -> logout<br>otomatis|



### **10. Model Data** 

Dokumen detail ERD dan spesifikasi tabel tersedia di Lampiran A (Spesifikasi Model Data). 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 22 

##### **Ringkasan Entitas Utama** 

|**Model (Tabel)**|**Fungsi**|
|---|---|
|`user_account`|Akun pengguna sistem|
|`personil`|Data personil lapangan/gudang|
|`gudang`|Master gudang (tetap & dadakan)|
|`zona_gudang`|Zona/rak di dalam gudang|
|`project`|Master proyek|
|`cluster`|Sub-unit proyek dengan BOQ|
|`barang`|Master barang/material|
|`kategori_barang`|Kategori material|
|`satuan`|Satuan ukuran barang|
|`supplier`|Master supplier|
|`kendaraan`|Master kendaraan|
|`titik_lapangan`|Lokasi lapangan proyek|
|`boq`|Bill of Quantity per cluster|
|`boq_item`|Line item BOQ|
|`permintaan_boq`|Request BOQ bottom-up|
|`tiket_material`|Tiket material untuk tracking|
|`surat_jalan`|Dokumen pengiriman (inbound/outbound)|
|`surat_jalan_item`|Item dalam surat jalan|
|`surat_jalan_item_pick`|Detail picking per item|
|`surat_jalan_item_unit`|Kondisi per unit fisik|
|`surat_jalan_item_foto`|Foto dokumentasi item|
|`surat_jalan_transit`|Checkpoint gudang transit|
|`stok_gudang`|Posisi stok saat ini per gudang/zona/kondisi|
|`stok_ledger`|Ledger semua mutasi stok|
|`laporan_mitra`|Laporan rekonsiliasi dari mitra|
|`return_transaction`|Transaksi return material|
|`additional_adjustment`|Penyesuaian stok manual|
|`reconciliation_upload_log`|Log upload rekonsiliasi Excel|
|`reconciliation_upload_detail`|Detail baris upload rekonsiliasi|
|`reconciliation_remains_note`|Catatan sisa rekonsiliasi|
|`audit_log`|Log semua aksi sistem|
|`approval_log`|Log approval per entitas|
|`notification`|Notifikasi in-app|
|`user_notification_preferences`|Preferensi notifikasi per user|
|`user_gudang`|Mapping user ke gudang|
|`zona_utilisasi_log`|Log perubahan status utilisasi zona|
|`password_reset_token`|Token reset password|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 23 

**11. Spesifikasi API** 

Dokumen detail endpoint tersedia di Lampiran B (Spesifikasi API). 

##### **Ringkasan Endpoint per Modul** 

|**Prefix**|**Modul**|**Jumlah Endpoint Aktual**|
|---|---|---|
|`/`|System Root|1|
|`/api/auth`|Autentikasi|8|
|`/api/warehouses`|Gudang|11|
|`/api/zones`|Zona Gudang|6|
|`/api/aisles`|Aisle (Lorong)|6|
|`/api/categories`|Kategori Barang|6|
|`/api/items`|Master Barang / Material|5|
|`/api/units`|Satuan|6|
|`/api/suppliers`|Supplier|6|
|`/api/vehicles`|Kendaraan|5|
|`/api/personnels`|Personil|5|
|`/api/projects`|Proyek|7|
|`/api/clusters`|Cluster Proyek|6|
|`/api/titik-lapangan`|Titik Lapangan|6|
|`/api/boqs`|Bill of Quantity (BOQ)|18|
|`/api/permintaan-boqs`|Permintaan BOQ Tambahan|7|
|`/api/surat-jalan`|Surat Jalan & Distribusi|23|
|`/api/dashboard`|Dashboard|7|
|`/api/reports`|Laporan & Rekonsiliasi|14|
|`/api/reconciliation`|Rekonsiliasi Lapangan|3|
|`/api/additional-adjustments`|Penyesuaian Tambahan (Adjustment)|2|
|`/api/notifications`|Notifikasi In-App|6|
|`/api/settings`|Pengaturan Sistem|4|
|`/api/users`|Manajemen Pengguna|6|
|`/api/profile`|Profil Pengguna|2|
|`/api/customers`|Customer|6|
|`/api/upload`|File Upload|2|
|**TOTAL**||**184 Endpoints**|



### **12. Autentikasi & Otorisasi** 

##### **Mekanisme Login** 

1. Client mengirimkan `POST /api/auth/login` dengan `{ email, password }` 

2. Backend verifikasi bcrypt password hash 

3. Backend menghasilkan dua token: 

   - **Access Token** (JWT): expire 24 jam, payload `{ id, email, role, avatar_url }` 

   - **Refresh Token** (JWT): expire 7 hari, payload `{ id, email, type: "refresh" }` 

4. Refresh token disimpan in-memory (Map) di backend — **[RISIKO: hilang saat server restart]** 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 24 

5. Client menyimpan access token di `localStorage` 

Referensi: `backend/src/modules/auth/auth.service.js:33-68` 

##### **Middleware Chain Backend** 

```
Request
```

- `-> auth.middleware.js       (verifikasi JWT + cek is_aktif)` 

- `-> role.middleware.js       (authorize berdasarkan roles)` 

- `-> gudang-scope.middleware.js  (filter data per gudang user)` 

- `-> Controller` 

Penjelasan masing-masing: 

- `auth.middleware.js` : Membaca header `Authorization: Bearer <token>` , verifikasi JWT, query DB untuk cek `is_aktif` 

- `role.middleware.js` : Membandingkan role user dengan roles yang diizinkan. Unauthorized attempt dicatat ke `audit_log` 

- `gudang-scope.middleware.js` : Membatasi query data hanya untuk gudang yang terdaftar di `user_gudang` untuk pengguna Staff 

##### **Proteksi Route Frontend** 

- `ProtectedRoute` ( `frontend/lib/protected-route.tsx` ): HOC yang memeriksa auth state dari `AuthContext` . Redirect ke `/` jika tidak terautentikasi 

- `AuthContext` ( `frontend/lib/auth-context.tsx` ): Validasi session ke `/api/auth/me` saat mount. Mendukung graceful degradation (fallback ke localStorage jika backend tidak tersedia, timeout 5 detik) 

- `AccountDeactivatedListener` : Mendeteksi respons `ACCOUNT_DEACTIVATED` dan menjalankan logout otomatis 

**Role & Permission Matrix** 

|**Aksi**|**Admin**|**Supervisor**|**Staff**|
|---|---|---|---|
|Login, Logout, Profile|Ya|Ya|Ya|
|Master Data CRUD|Ya|Baca saja|Tidak|
|Buat/Edit BOQ|Ya|Ya|Tidak|
|Approve/Reject SJ Outbound|Tidak|Ya|Tidak|
|Konfirmasi Distribusi|Tidak|Ya|Tidak|
|Buat SJ Inbound|Ya|Tidak|Ya|
|Terima Inbound|Ya|Ya|Ya|
|Putaway & Retrieval|Ya|Ya|Ya|
|Transit Gudang|Tidak|Tidak|Ya|
|Laporan & Audit|Ya|Tidak|Tidak|
|Upload Rekonsiliasi|Ya|Ya|Tidak|
|Kelola Pengguna|Ya|Tidak|Tidak|
|Utilisasi Zona|Ya|Ya|Tidak|
|Additional Adjustment|Ya|Ya|Tidak|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 25 

### **13. Integrasi Pihak Ketiga** 

|**Layanan**|**Tujuan**|**Implementasi**|**Konfigurasi**|
|---|---|---|---|
|**PostgreSQL**|Database utama|Prisma ORM|`DATABASE_URL`env var|
|**ExcelJS**v4.4.0|Generate & parse file Excel|Backend reports.service.js; Frontend<br>exportReconciliationXlsx.ts|-|
|**xlsx**v0.18.5|Parse file Excel upload|Backend rekonsiliasi|-|
|**@react-pdf/renderer**<br>v4.6.0|Generate PDF Surat Jalan|Frontend|-|
|**pdfjs-dist**3.11.174|Render/preview PDF|Frontend PdfViewerComponent.tsx|Override versi di<br>package.json|
|**Multer**v2.2.0|File upload handler|Backend upload.controller.js, users.controller.js|Local disk /uploads/|



##### **Catatan Integrasi Email [TIDAK DITEMUKAN]** 

Sistem **belum mengintegrasikan** layanan email. Fungsi `forgotPassword` di `auth.service.js:172` hanya menghasilkan URL reset tanpa mengirimkan email. URL dikembalikan dalam response API, bukan dikirim ke pengguna. 

### **14. Non-Functional Requirements** 

##### **NFR-001 - Keamanan** 

|**Item**|**Implementasi**|**File**|
|---|---|---|
|Password hashing|bcrypt|`backend/src/shared/password.js`|
|JWT expiry|Access: 24h, Refresh: 7d|`auth.service.js`|
|CORS|Whitelist origin: localhost:3000, 3001, 5173|`backend/src/app.js:36`|
|Role-based access|`authorize()`middleware|`role.middleware.js`|
|Akun non-aktif|Cek`is_aktif`di setiap request|`auth.middleware.js:41-51`|
|Input validation|Zod schemas di setiap route|`validation.middleware.js`|
|Audit trail|`audit_log`untuk semua aksi|`role.middleware.js`+ service|
|SQL injection protection|Prisma ORM (parameterized queries)|Seluruh repository|



##### **NFR-002 - Performa** 

|**Item**|**Konfigurasi**|
|---|---|
|Database index|40+ index di schema.prisma (email, status, project_id, dll.)|
|JSON serialization|BigInt -> String di response middleware`app.js:58-68`|
|Frontend caching|SWR + TanStack Query dengan deduplication|
|Bundle analyzer|`@next/bundle-analyzer`, aktif via`ANALYZE=true`|



##### **NFR-003 - Responsivitas** 

- Layout menggunakan Tailwind CSS responsive breakpoints 

- Sidebar collapsible dengan CSS transition 

- Halaman staff didesain mobile-first (dari `MobileCardList.tsx` ) 

##### **NFR-004 - Error Handling** 

- Backend: Global error middleware ( `error.middleware.js` ) menangkap semua unhandled errors 

- Custom `AppError` class dengan `statusCode` — `backend/src/shared/errors.js` 

- Token expired: ditangani dengan redirect ke login 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 26 

- Server log: `backend/server-out.log` dan `backend/server-err.log` 

##### **NFR-005 - Logging** 

- HTTP request logging: **Morgan** ( `dev` format) — `app.js:54` 

##### **NFR-006 - Aksesibilitas** 

- [TIDAK DITEMUKAN] Tidak ada konfigurasi khusus aksesibilitas (ARIA, dll.) yang teridentifikasi 

### **15. Konfigurasi & Environment** 

##### **Backend - Environment Variables** 

|**Variable**|**Fungsi**|**Wajib**|**Format**|
|---|---|---|---|
|`PORT`|Port server Express|Opsional (default 5000)|Angka|
|`DATABASE_URL`|PostgreSQL connection string|**Wajib**|`postgresql://user:pass@host:port/db`|
|`JWT_SECRET`|Secret key untuk access token|**Wajib**|String random panjang|
|`JWT_REFRESH_SECRET`|Secret key untuk refresh token|**Wajib**|String random panjang|
|`JWT_REFRESH_EXPIRES`|Durasi refresh token|Opsional (default`7d`)|`7d`,`30d`, dll.|
|`NODE_ENV`|Environment mode|Opsional|`development`/`production`|
|`NEXT_PUBLIC_APP_URL`|URL frontend (untuk reset URL)|Opsional|`http://localhost:3000`|



##### **Frontend - Environment Variables** 

|**Variable**|**Fungsi**|**Wajib**|**Format**|
|---|---|---|---|
|`NEXT_PUBLIC_API_URL`|Base URL backend API|**Wajib**|`http://localhost:5000`|
|`ANALYZE`|Aktifkan bundle analyzer|Opsional|`true`/`false`|



##### **Cara Menjalankan Lokal** 

```
# 1. Setup database PostgreSQL
psql -U postgres -c "CREATE DATABASE digitak_warehouse;"
```

```
# 2. Backend
cd backend
npm install
# Buat file .env dengan nilai yang sesuai
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev          # Berjalan di http://localhost:5000
```

```
# 3. Frontend (terminal baru)
cd frontend
npm install
# Buat file .env.local: NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev          # Berjalan di http://localhost:3000
```

##### **Script Backend** 

|**Script**|**Perintah**|**Fungsi**|
|---|---|---|
|`npm run dev`|`nodemon src/server.js`|Development dengan auto-reload|
|`npm start`|`node src/server.js`|Production|
|`npm run seed`|`node prisma/seed.js`|Seed data awal|
|`npm test`|Node built-in test runner|Jalankan semua unit test|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 27 

### **16. Testing & Quality** 

##### **Unit Test** 

|**File Test**|**Modul**|**Framework**|
|---|---|---|
|`backend/src/middlewares/gudang-scope.middleware.test.js`(9 KB)|Gudang Scope|Node.js built-in`--test`|
||Middleware||
|`backend/src/modules/surat-jalan/surat-jalan.service.test.js`(31|Surat Jalan Service|Node.js built-in`--test`|
|KB)|||
|`backend/src/modules/dashboard/dashboard.repository.test.js`(6 KB)|Dashboard Repository|Node.js built-in`--test`|



##### **Linting** 

- **Frontend** : ESLint 9 dengan `eslint-config-next` — `frontend/eslint.config.mjs` 

- **Backend** : [TIDAK DITEMUKAN] Tidak ada konfigurasi ESLint/Prettier 

- `frontend/lint-output.txt` (768 KB) menunjukkan banyak warning/error yang belum diselesaikan 

##### **CI/CD** 

- [TIDAK DITEMUKAN] Tidak ada file konfigurasi CI/CD ( `.github/workflows/` , `Jenkinsfile` , dll.) 

### **17. Temuan & Risiko** 

##### **Risiko Tinggi** 

|**ID**|**Temuan**|**Lokasi**|**Dampak**|
|---|---|---|---|
|R-001|**Refresh token disimpan in-memory (Map)**— hilang saat server<br>restart|`auth.service.`<br>`js:11`|Semua sesi logout saat restart|
|R-002|**File .env berisi nilai aktual**(password DB, JWT secret) sudah di<br>`.gitignore`tapi tetap berisiko|`backend/.env`|Kebocoran credential|
|R-003|**Linting error besar**—`lint-output.txt`768 KB mengindikasikan<br>ratusan TypeScript/ESLint error|`frontend/`|Bug tersembunyi, code quality<br>rendah|
|R-004|**Tidak ada email service**— forgot password tidak mengirim email,<br>URL reset hanya di response API|`auth.service.`<br>`js:172`|Pengguna tidak bisa reset password<br>mandiri|



##### **Risiko Sedang** 

|**ID**|**Temuan**|**Lokasi**|**Dampak**|
|---|---|---|---|
|R-005|**Endpoint deprecated masih aktif**—`PUT`<br>`/api/dashboard/warehouse-assessment/:gudangId`|`dashboard.routes.j`<br>`s:15-19`|Inkonsistensi API|
|R-006|**Tidak ada rate limiting**— tidak ada middleware pembatas request|`app.js`|Rentan brute-force login|
|R-007|**Tidak ada CI/CD pipeline**— deployment manual|Root|Risiko human error saat<br>deploy|
|R-008|**Coverage test rendah**— hanya 3 file test untuk 28 modul|`backend/src/`|Bug tidak terdeteksi|
|R-009|**File helper debug masih ada**— 100+ file`check-*.js`,`fix-*.js`di<br>root`frontend/`|`frontend/`|Membingungkan, repo kotor|



##### **Risiko Rendah / Technical Debt** 

|**ID**|**Temuan**|**Lokasi**|
|---|---|---|
|R-010|Tidak ada Docker/containerization setup|Root|
|R-011|Tidak ada dokumentasi API interaktif (Swagger/OpenAPI)|Backend|
|R-012|Backup file masih ada di repo (`backup_before_cluster_reset.dump`)|`backend/`|
|R-013|Banyak file`.js`sementara di root`backend/`(`_tmp_*.js`,`analyze_*.js`)|`backend/`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 28 

### **18. Rekomendasi & Roadmap** 

##### **Prioritas Tinggi** 

1. **Implementasi email service** untuk forgot/reset password (SendGrid, Nodemailer, dll.) 

2. **Migrasi refresh token ke database** agar persisten saat server restart 

3. **Tambah rate limiting** (express-rate-limit) untuk endpoint auth 

4. **Bersihkan lint errors** — resolve ratusan TypeScript/ESLint error di frontend 

5. **Pastikan .env tidak pernah di-commit** — pertimbangkan secret management 

##### **Prioritas Sedang** 

6. **Setup CI/CD pipeline** (GitHub Actions) untuk auto-test dan auto-deploy 

7. **Dokumentasi API dengan Swagger/OpenAPI** 

8. **Hapus file debug sementara** dari `frontend/` (100+ file check-*.js, fix-*.js) 

9. **Bersihkan file sementara** dari `backend/` 

10. **Tambah test coverage** untuk modul kritis: BOQ, Rekonsiliasi, Return, Notifikasi 

11. **Remove/replace deprecated endpoint** `PUT /api/dashboard/warehouse-assessment/:gudangId` 

##### **Prioritas Rendah** 

12. **Dockerize aplikasi** untuk kemudahan deployment 

13. **Tambah endpoint health check** ( `GET /health` ) untuk monitoring 

14. **Pertimbangkan Redis** untuk refresh token store agar lebih scalable 

15. **Tambah ESLint untuk backend** 

16. **Implementasi notifikasi real-time** (WebSocket/SSE) 

##### **Fitur yang Tampak Belum Selesai** 

- **Modul** `capacity` di `backend/src/modules/capacity/` — ada folder tapi tidak di-mount di `app.js` 

- `customer` **module** terdaftar di backend dan frontend tapi tidak ada di navigasi utama ( `navigation.ts` ) 

- **Email delivery** untuk reset password link 

### **19. Lampiran** 

##### **Glosarium** 

|**Istilah**|**Definisi**|
|---|---|
|BOQ|Bill of Quantity — daftar material yang direncanakan untuk satu cluster proyek|
|Cluster|Sub-unit dari proyek, memiliki BOQ tersendiri dan tiket material|
|Tiket Material|Identifier unik untuk tracking material per pekerjaan lapangan|
|Surat Jalan (SJ)|Dokumen resmi pengiriman/penerimaan barang|
|Putaway|Proses penempatan barang ke zona/rak spesifik setelah diterima|
|Retrieval/Picking|Proses pengambilan barang dari zona untuk persiapan pengiriman|
|Rekonsiliasi|Proses pencocokan data material gudang vs lapangan|
|Laporan Mitra|Laporan dari kontraktor/mitra lapangan tentang penggunaan material|
|Gudang Dadakan|Gudang transit sementara, berbeda dari gudang tetap|
|Stok Ledger|Catatan kronologis semua mutasi stok (in/out)|
|MOS|Material Order Sheet — acuan jumlah material yang dibutuhkan|
|Remains Lapangan|Sisa material yang masih ada di lapangan menurut laporan mitra|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 29 

##### **Daftar Dependensi Backend** 

|**Paket**|**Versi**|**Fungsi**|
|---|---|---|
|`@prisma/client`|^6.16.3|Prisma ORM client|
|`bcrypt`|^6.0.0|Password hashing|
|`cookie-parser`|^1.4.7|Parse HTTP cookies|
|`cors`|^2.8.6|CORS middleware|
|`dotenv`|^17.4.2|Load env variables|
|`exceljs`|^4.4.0|Generate/parse Excel|
|`express`|^5.2.1|Web framework|
|`express-async-handler`|^1.2.0|Async error wrapper|
|`jsonwebtoken`|^9.0.3|JWT sign & verify|
|`morgan`|^1.11.0|HTTP request logger|
|`multer`|^2.2.0|File upload middleware|
|`pg`|^8.22.0|PostgreSQL driver|
|`prisma`|^6.16.3|Prisma CLI|
|`xlsx`|^0.18.5|Excel parsing|
|`zod`|^4.4.3|Schema validation|
|`nodemon`|^3.1.14|Dev auto-reload|



##### **Daftar Dependensi Frontend** 

|**Paket**|**Versi**|**Fungsi**|
|---|---|---|
|`next`|16.3.0|React framework|
|`react`|19.2.8|UI library|
|`@tanstack/react-query`|^5.101.4|Server state management|
|`axios`|^1.19.0|HTTP client|
|`react-hook-form`|^7.84.0|Form management|
|`zod`|^4.4.3|Schema validation|
|`@react-pdf/renderer`|^4.6.0|PDF generation|
|`exceljs`|^4.4.0|Excel export|
|`lucide-react`|^1.30.0|Icon library|
|`tailwindcss`|^4|CSS framework|
|`shadcn`|^4.16.1|Component library|
|`swr`|^2.5.1|Data fetching|
|`react-easy-crop`|^6.2.3|Image crop|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 30 

##### **Daftar Asumsi yang Belum Terverifikasi** 

|**ID**|**Asumsi**|**Alasan**|
|---|---|---|
|A-001|Email service tidak diimplementasi|Tidak ditemukan library SMTP di`package.json`dan`auth.service.js`<br>hanya return URL|
|A-002|Sistem masih running lokal (bukan production)|URL dan config hanya merujuk localhost|
|A-003|Modul`capacity`belum diintegrasikan|Ada folder`backend/src/modules/capacity/`tapi tidak di-mount di<br>`app.js`|
|A-004|Halaman`customer`tidak digunakan aktif|Ada di backend dan frontend, tapi tidak ada di`navigationConfig`|
|A-005|Metrik keberhasilan bisnis belum didefinisikan|Tidak ditemukan di kode atau dokumentasi|
|A-006|Tidak ada pengiriman notifikasi real-time|Tidak ditemukan WebSocket/SSE implementation|
|A-007|`gudang-scope.middleware.js`berlaku untuk Staff|Berdasarkan pola penggunaan di route surat-jalan|



_Dokumen ini di-generate dengan cara reverse-engineering dari codebase aktual pada 13 Oktober 2026. Informasi dapat diverifikasi dari file yang direferensikan._ 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 31 

## **Lampiran A: Spesifikasi Model Data** 

**Dokumen Pendukung PRD** — Bab 10 (Model Data & Skema Database) **Sumber Data:** `backend/prisma/schema.prisma` **Dialek Database:** PostgreSQL (Prisma ORM) **Jumlah Model/Tabel:** 37 model **Jumlah Enum:** 23 enum 

#### **A.1 Diagram Relasi Entitas (ERD)** 

Catatan: ERD pada dokumen sumber dipecah menjadi tiga diagram per domain agar terbaca pada halaman PDF. Seluruh 36 relasi pada diagram sumber tetap tercakup. 



<!-- Start of picture text -->
user_account gudang<br>Oy<br>memiliki sta<br>mencatat aksi memberi persetujuan ditugaskan ke jenerima memiliki memiliki zona<br>9 g Q oO 4 Q<br>AN A SS A A aN<br>audit_log approval_log user_notification_preferences<br>riwayat utilisasi<br>fe)<br>M\<br>zona_utilisasi_log<br><!-- End of picture text -->

_Gambar A.1. Domain 1: Pengguna, Gudang, Zona, Notifikasi, dan Log_ 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 32 



<!-- Start of picture text -->
memiliki cluster memiliki titk<br>o fe)<br>A AN<br>— —<br>memiliki BOQ request BOQ jemiliki tiket kategort satuan unit pemasok<br>fe) fe) te) fe)<br>AN AN AN AN<br>oO O<br>permintaan_boq tiket_material q barang 7<br>rincian item BOQ didaftarkan-di BOQ laporan lapangan<br>ye) )<br>S AN<br>b>O<br>[mp<br><!-- End of picture text -->

_Gambar A.2. Domain 2: Proyek, Cluster, BOQ, dan Master Barang_ 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 33 



<!-- Start of picture text -->
zona_gudang , | gudang | | barang cluster kendaraan<br>tt ———<br>menyimpain isk =e ES<br>} stok vias! pada mutasifédger asalfujuan Sd tujuan pengiriman dasar penerbitan S3 armada pengangkut _-ativertkoordinator<br>ars ts \ — \ /<br>if — 4 —$ NN } 7 _———<br>val aA —_ — = _<br>stok_gudang stok_ledger dimuat| di SI —o& surat_jalan Bo<br>| tl<br>\ _— ) N<br>beri item melewatitransit ietur dar<br>— C ‘0<br>ON _—<br>> on A<br>‘surat_jalan_item ‘surat_jalan_transit return_transaction<br>detail pickingg9g foto dokumentasi2) —~ status peree2 unit<br>surat_jalan_item_pick surat_jalan_item_foto surat_jalan_item_unit<br><!-- End of picture text -->

_Gambar A.3. Domain 3: Surat Jalan, Stok, Kendaraan, Personil, dan Return_ 

#### **A.2 Daftar Enum Database (23 Enum)** 

##### **Enum** `jenis_laporan_enum` 

|**Nilai (Value)**<br>`excel`|
|---|
|`manual`<br>`migrasi_sistem`|



##### **Enum** `reconciliation_detail_status` 



<!-- Start of picture text -->
Nilai (Value)<br>berhasil<br>gagal<br><!-- End of picture text -->

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 34 

##### **Enum** `user_role` 

|**Nilai (Value)**<br>`admin_general`|
|---|
|`supervisor`|
|`staf_gudang`|



##### **Enum** `personil_jenis` 

**Nilai (Value)** `teknisi admin_gudang pengantar_logistik` 

##### **Enum** `gudang_tipe` 

###### **Nilai (Value)** 

```
tetap
dadakan
```

##### **Enum** `tujuan_tipe_enum` 

###### **Nilai (Value)** 

```
lapangan
gudang
```

##### **Enum** `tipe_pengirim_enum` 

###### **Nilai (Value)** 

```
internal
```

```
external
```

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 35 

##### **Enum** `boq_status` 

|**Nilai (Value)**|
|---|
|`draft`|
|`aktif`|
|`selesai`|
|`ditolak`|



##### **Enum** `boq_source` 

**Nilai (Value)** `top_down bottom_up` 

##### **Enum** `external_verification_status` 

|**Nilai (Value)**|
|---|
|`terverifikasi`|
|`menunggu`|
|`tidak_berlaku`|



##### **Enum** `permintaan_boq_status` 

|**Nilai (Value)**|
|---|
|`diajukan`|
|`ditinjau`|
|`disetujui`<br>`ditolak`|



##### **Enum** `surat_jalan_tipe` 

|**Nilai (Value)**<br>`inbound`<br>`outbound`|
|---|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 36 

##### **Enum** `surat_jalan_status` 

|**Nilai (Value)**|
|---|
|`draft_diajukan`|
|`menunggu_verifikasi`|
|`ready_putaway`|
|`disetujui`|
|`sedang_dikirim`|
|`tiba_di_transit`|
|`tiba_menunggu_konfirmasi`|
|`diterima_didistribusikan`|
|`ditolak`|
|`digenerate`|



##### **Enum** `kondisi_barang` 

|**Nilai (Value)**|
|---|
|`baik`|
|`rusak_ringan`|
|`rusak_berat`|
|`tidak_sesuai_spek`|
|`doa`|



##### **Enum** `mutasi_jenis` 

**Nilai (Value)** `in out` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 37 

##### **Enum** `return_status` 

|**Nilai (Value)**|
|---|
|`draft`|
|`diajukan`|
|`disetujui`|
|`diterima_gudang`|
|`ditolak`|



##### **Enum** `approval_entity_type` 

**Nilai (Value)** `boq surat_jalan return_transaction` 

##### **Enum** `approval_tahap` 

|**Nilai (Value)**|
|---|
|`aktivasi_boq`|
|`inbound_verifikasi`|
|`inbound_putaway`|
|`outbound_approval`|
|`outbound_delivery`|
|`outbound_kritis`|
|`outbound_di_luar_boq`|
|`outbound_melebihi_remains`|
|`return_approval`|
|`return_receive`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 38 

##### **Enum** `approval_status` 

|**Nilai (Value)**|
|---|
|`menunggu`|
|`disetujui`|
|`ditolak`|



##### **Enum** `status_kecukupan_zona` 

**Nilai (Value)** `CUKUP MENDEKATI_PENUH TIDAK_CUKUP` 

##### **Enum** `status_kecukupan_source` 

**Nilai (Value)** `AUTO MANUAL` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 39 

##### **Enum** `audit_aksi` 

**Nilai (Value)** `create update delete approve receive_inbound approve_inbound approve_outbound confirm_distributed reject_inbound reject_outbound putaway retrieve create_inbound create_outbound start_delivery report_arrival tiba_di_transit lanjut_dari_transit nonaktifkan_project aktifkan_project soft_delete restore input_rekonsiliasi` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 40 

##### **Enum** `notification_type` 

|**Nilai (Value)**<br>`info`|
|---|
|`approval`|
|`warning`|
|`success`|
|`error`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 41 

#### **A.3 Spesifikasi Detail Entitas (37 Model)** 

##### **1. Model** `user_account` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`user_id`|`BigInt`|@id @default(autoincrement())|
|`nama`|`String`|-|
|`email`|`String`|@unique|
|`password_hash`|`String`|-|
|`role`|`user_role`|-|
|`is_aktif`|`Boolean`|@default(true)|
|`must_change_password`|`Boolean`|@default(false)|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now())|
|`approval_logs`|`approval_log[]`|-|
|`audit_logs`|`audit_log[]`|-|
|`created_barangs`|`barang[]`|@relation("barang_created_by")|
|`updated_barangs`|`barang[]`|@relation("barang_updated_by")|
|`created_boqs`|`boq[]`|@relation("boq_created_by")|
|`boq_diaktifkan_oleh`|`boq[]`|@relation("boq_diaktifkan")|
|`updated_boqs`|`boq[]`|@relation("boq_updated_by")|
|`created_gudangs`|`gudang[]`|@relation("gudang_created_by")|
|`updated_gudangs`|`gudang[]`|@relation("gudang_updated_by")|
|`created_kendaraans`|`kendaraan[]`|@relation("kendaraan_created_by")|
|`updated_kendaraans`|`kendaraan[]`|@relation("kendaraan_updated_by")|
|`personil_creator`|`personil[]`|@relation("personil_created_by")|
|`personil_updater`|`personil[]`|@relation("personil_updated_by")|
|`personils`|`personil?`|-|
|`created_projects`|`project[]`|@relation("project_created_by")|
|`updated_projects`|`project[]`|@relation("project_updated_by")|
|`created_titik_lapangans`|`titik_lapangan[]`|@relation("titik_lapangan_created_by")|
|`updated_titik_lapangans`|`titik_lapangan[]`|@relation("titik_lapangan_updated_by")|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 42 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`created_surat_jalans`|`surat_jalan[]`|@relation("surat_jalan_created_by")|
|`updated_surat_jalans`|`surat_jalan[]`|@relation("surat_jalan_updated_by")|
|`surat_jalan_dilaporkan_tiba`|`surat_jalan[]`|@relation("surat_jalan_dilaporkan_tiba_oleh")|
|`surat_jalan_dikonfirmasi_tiba`|`surat_jalan[]`|@relation("surat_jalan_dikonfirmasi_oleh")|
|`surat_jalan_transit_tiba`|`surat_jalan_transit[]`|@relation("surat_jalan_transit_tiba_oleh")|
|`surat_jalan_transit_berangkat`|`surat_jalan_transit[]`|@relation("surat_jalan_transit_berangkat_oleh")|
|`created_tiket_materials`|`tiket_material[]`|@relation("tiket_material_created_by")|
|`zona_utilisasi_logs`|`zona_utilisasi_log[]`|@relation("zona_utilisasi_log_updater")|
|`zona_dinilai_oleh`|`zona_gudang[]`|@relation("ZonaGudangDinilaiOleh")|
|`surat_jalan_item_diperiksa_oleh`|`surat_jalan_item[]`|@relation("SuratJalanItemDiperiksaOleh")|
|`reconciliation_upload_logs`|`reconciliation_upload_log[]`|@relation("ReconciliationUploadLogActor")|
|`laporan_mitras`|`laporan_mitra[]`|@relation("LaporanMitraUploader")|
|`notifications`|`notification[]`|-|
|`notification_preferences`|`user_notification_preferences[]`|-|
|`user_gudangs`|`user_gudang[]`|-|
|`created_return_transactions`|`return_transaction[]`|@relation("ReturnCreatedBy")|
|`approved_return_transactions`|`return_transaction[]`|@relation("ReturnApprovedBy")|
|`received_return_transactions`|`return_transaction[]`|@relation("ReturnReceivedBy")|
|`additional_adjustments`|`additional_adjustment[]`|-|
|`created_reconciliation_remains_notes`|`reconciliation_remains_note[]`|@relation("ReconciliationRemainsNoteCreatedBy")|
|`updated_reconciliation_remains_notes`|`reconciliation_remains_note[]`|@relation("ReconciliationRemainsNoteUpdatedBy")|



###### **Index & Constraint Tingkat Model:** 

- `@@index([email])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 43 

##### **2. Model** `user_notification_preferences` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`id`|`BigInt`|@id @default(autoincrement())|
|`user_id`|`BigInt`|-|
|`category`|`String`|-|
|`enabled`|`Boolean`|@default(true)|
|`created_at`|`DateTime`|@default(now()) @db.Timestamptz|
|`updated_at`|`DateTime`|@default(now()) @db.Timestamptz|
|`user`|`user_account`|@relation(fields: [user_id], references: [user_id], onDelete: Cascade)|



###### **Index & Constraint Tingkat Model:** 

- `@@unique([user_id, category])` 

- `@@index([user_id])` 

##### **3. Model** `user_gudang` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`id`|`BigInt`|@id @default(autoincrement())|
|`user_id`|`BigInt`|-|
|`gudang_id`|`BigInt`|-|
|`created_at`|`DateTime`|@default(now())|
|`gudang`|`gudang`|@relation(fields: [gudang_id], references: [gudang_id], onDelete: Cascade)|
|`user`|`user_account`|@relation(fields: [user_id], references: [user_id], onDelete: Cascade)|



###### **Index & Constraint Tingkat Model:** 

- `@@unique([user_id, gudang_id])` 

- `@@index([gudang_id])` 

- `@@index([user_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 44 

##### **4. Model** `personil` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`personil_id`|`BigInt`|@id @default(autoincrement())|
|`nama`|`String`|-|
|`jenis`|`personil_jenis`|-|
|`no_hp`|`String?`|-|
|`nik`|`String?`|@unique|
|`email`|`String?`|@unique|
|`posisi`|`String?`|-|
|`bisa_menyetir`|`Boolean?`|@default(false)|
|`is_material_handler`|`Boolean?`|@default(false)|
|`foto`|`String?`|-|
|`user_id`|`BigInt?`|@unique|
|`gudang_id`|`BigInt?`|-|
|`is_dummy`|`Boolean`|@default(false)|
|`is_aktif`|`Boolean`|@default(true)|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now())|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt`|-|
|`gudang_pics`|`gudang[]`|@relation("gudang_pic")|
|`cluster_pic`|`cluster[]`|@relation("ClusterPic")|
|`permintaan_boq_diajukan`|`permintaan_boq[]`|@relation("permintaan_diajukan_oleh")|
|`permintaan_boq_ditinjai`|`permintaan_boq[]`|@relation("permintaan_ditinjai_oleh")|
|`creator`|`user_account`|@relation("personil_created_by", fields: [created_by], references: [user_id])|
|`gudang`|`gudang?`|@relation("personil_gudang", fields: [gudang_id], references: [gudang_id])|
|`updater`|`user_account`|@relation("personil_updated_by", fields: [updated_by], references: [user_id])|
|`user`|`user_account?`|@relation(fields: [user_id], references: [user_id])|
|`surat_jalan_pengantar`|`surat_jalan[]`|-|



###### **Index & Constraint Tingkat Model:** 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 45 

- `@@index([user_id])` 

- `@@index([nik])` 

- `@@index([gudang_id])` 

##### **5. Model** `kendaraan` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`kendaraan_id`|`BigInt`|@id @default(autoincrement())|
|`no_polisi`|`String`|@unique|
|`jenis_kendaraan`|`String`|-|
|`merk`|`String?`|-|
|`kapasitas_angkut`|`Decimal?`|@db.Decimal(12, 2)|
|`keterangan`|`String?`|-|
|`foto`|`String?`|-|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now())|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt`|-|
|`gudang_id`|`BigInt?`|-|
|`gudang`|`gudang?`|@relation("kendaraan_gudang", fields: [gudang_id], references: [gudang_id])|
|`creator`|`user_account`|@relation("kendaraan_created_by", fields: [created_by], references: [user_id])|
|`updater`|`user_account`|@relation("kendaraan_updated_by", fields: [updated_by], references: [user_id])|
|`surat_jalans`|`surat_jalan[]`|-|



###### **Index & Constraint Tingkat Model:** 

- `@@index([no_polisi])` 

- `@@index([gudang_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 46 

##### **6. Model** `project` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`project_id`|`BigInt`|@id @default(autoincrement())|
|`nama_project`|`String`|-|
|`title`|`String?`|-|
|`cluster_id`|`String?`|-|
|`area`|`String?`|-|
|`klien`|`String?`|-|
|`kecamatan`|`String?`|-|
|`desa_kelurahan`|`String?`|-|
|`kota_kabupaten`|`String?`|-|
|`provinsi`|`String?`|-|
|`status_aktif`|`Boolean`|@default(true)|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now())|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt`|-|
|`gudangs`|`gudang[]`|-|
|`permintaan_boqs`|`permintaan_boq[]`|-|
|`creator`|`user_account`|@relation("project_created_by", fields: [created_by], references: [user_id])|
|`updater`|`user_account`|@relation("project_updated_by", fields: [updated_by], references: [user_id])|
|`stok_gudangs`|`stok_gudang[]`|-|
|`surat_jalans`|`surat_jalan[]`|-|
|`tiket_materials`|`tiket_material[]`|-|
|`titik_lapangans`|`titik_lapangan[]`|-|
|`laporans`|`laporan_mitra[]`|@relation("LaporanMitraProject")|
|`return_transactions`|`return_transaction[]`|-|
|`clusters`|`cluster[]`|-|
|`additional_adjustments`|`additional_adjustment[]`|-|
|`reconciliation_remains_notes`|`reconciliation_remains_note[]`|-|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 47 

###### **Index & Constraint Tingkat Model:** 

- `@@index([area])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 48 

##### **7. Model** `cluster` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`cluster_id`|`String`|@id @db.Text|
|`project_id`|`BigInt`|-|
|`nama_cluster`|`String`|@db.Text|
|`cluster_type`|`String?`|@db.Text|
|`project_type`|`String?`|@db.Text|
|`kso_partner`|`String?`|@db.Text|
|`kso_contact`|`String?`|@db.Text|
|`no_tiket_release`|`String?`|@db.Text|
|`vendor`|`String?`|@db.Text|
|`alamat_lengkap`|`String?`|@db.Text|
|`homepass_plan`|`Int?`|-|
|`status_aktif`|`Boolean`|@default(true)|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now())|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt`|-|
|`pic_id`|`BigInt?`|-|
|`project`|`project`|@relation(fields: [project_id], references: [project_id], onDelete: Restrict)|
|`pic`|`personil?`|@relation("ClusterPic", fields: [pic_id], references: [personil_id])|
|`boqs`|`boq[]`|-|
|`boq_items`|`boq_item[]`|-|
|`surat_jalans_direct`|`surat_jalan[]`|-|
|`surat_jalan_items`|`surat_jalan_item[]`|-|
|`permintaan_boqs`|`permintaan_boq[]`|-|
|`return_transactions`|`return_transaction[]`|@relation("ReturnCluster")|
|`laporans`|`laporan_mitra[]`|@relation("ClusterLaporan")|
|`stok_ledgers`|`stok_ledger[]`|-|
|`tikets`|`tiket_material[]`|@relation("ClusterTiket")|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 49 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`additional_adjustment`|`additional_adjustment[]`|-|
|`reconciliation_remains_notes`|`reconciliation_remains_note[]`|-|



###### **Index & Constraint Tingkat Model:** 

- `@@unique([project_id, nama_cluster])` 

- `@@index([project_id])` 

##### **8. Model** `titik_lapangan` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`titik_lapangan_id`|`BigInt`|@id @default(autoincrement())|
|`project_id`|`BigInt`|-|
|`nama_lokasi`|`String`|-|
|`latitude`|`String?`|-|
|`longitude`|`String?`|-|
|`alamat`|`String?`|-|
|`is_aktif`|`Boolean`|@default(true)|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@updatedAt|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt`|-|
|`project`|`project`|@relation(fields: [project_id], references: [project_id])|
|`creator`|`user_account`|@relation("titik_lapangan_created_by", fields: [created_by], references: [user_id])|
|`updater`|`user_account`|@relation("titik_lapangan_updated_by", fields: [updated_by], references: [user_id])|
|`surat_jalans`|`surat_jalan[]`|-|



###### **Index & Constraint Tingkat Model:** 

- `@@index([project_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 50 

##### **9. Model** `gudang` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`gudang_id`|`BigInt`|@id @default(autoincrement())|
|`nama_gudang`|`String`|-|
|`tipe`|`gudang_tipe`|@default(tetap)|
|`alamat`|`String?`|-|
|`project_id`|`BigInt?`|-|
|`latitude`|`String?`|-|
|`longitude`|`String?`|-|
|`keterangan`|`String?`|-|
|`kapasitas_maksimum`|`Int?`|-|
|`status_kecukupan_gudang`|`status_kecukupan_zona?`|-|
|`is_aktif`|`Boolean`|@default(true)|
|`is_internal`|`Boolean`|@default(true)|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now())|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt`|-|
|`pic_id`|`BigInt?`|-|
|`boq_items`|`boq_item[]`|-|
|`creator`|`user_account`|@relation("gudang_created_by", fields: [created_by], references: [user_id])|
|`pic`|`personil?`|@relation("gudang_pic", fields: [pic_id], references: [personil_id])|
|`project`|`project?`|@relation(fields: [project_id], references: [project_id])|
|`updater`|`user_account`|@relation("gudang_updated_by", fields: [updated_by], references: [user_id])|
|`personil_gudang`|`personil[]`|@relation("personil_gudang")|
|`kendaraans`|`kendaraan[]`|@relation("kendaraan_gudang")|
|`stok_gudangs`|`stok_gudang[]`|-|
|`surat_jalan_asal`|`surat_jalan[]`|@relation("surat_jalan_asal")|
|`surat_jalan_tujuan`|`surat_jalan[]`|@relation("surat_jalan_tujuan")|
|`transit_checkpoints`|`surat_jalan_transit[]`|@relation("gudang_transit")|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 51 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`zonas`|`zona_gudang[]`|-|
|`user_gudangs`|`user_gudang[]`|-|



###### **Index & Constraint Tingkat Model:** 

- `@@index([project_id])` 

- `@@index([tipe])` 

##### **10. Model** `zona_gudang` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`zona_id`|`BigInt`|@id @default(autoincrement())|
|`gudang_id`|`BigInt`|@db.BigInt|
|`gudang`|`gudang`|@relation(fields: [gudang_id], references: [gudang_id], onDelete: Cascade)|
|`kode_zona`|`String`|@db.Text|
|`nama_zona`|`String?`|@db.Text|
|`tipe_zona`|`String?`|@db.Text|
|`kapasitas_maksimum`|`Int?`|-|
|`status_kecukupan`|`status_kecukupan_zona?`|@default(CUKUP)|
|`status_kecukupan_source`|`status_kecukupan_source?`|-|
|`dinilai_oleh`|`BigInt?`|-|
|`dinilai_pada`|`DateTime?`|-|
|`dinilai_oleh_user`|`user_account?`|@relation("ZonaGudangDinilaiOleh", fields: [dinilai_oleh], references: [user_id])|
|`utilisasi_logs`|`zona_utilisasi_log[]`|-|
|`surat_jalan_items`|`surat_jalan_item[]`|-|
|`stok_gudangs`|`stok_gudang[]`|-|



###### **Index & Constraint Tingkat Model:** 

- `@@unique([gudang_id, kode_zona])` 

- `@@index([gudang_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 52 

##### **11. Model** `zona_utilisasi_log` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`log_id`|`BigInt`|@id @default(autoincrement())|
|`zona_id`|`BigInt`|-|
|`status`|`status_kecukupan_zona`|-|
|`diperbarui_oleh`|`BigInt`|-|
|`catatan`|`String?`|-|
|`created_at`|`DateTime`|@default(now())|
|`diperbarui_user`|`user_account`|@relation("zona_utilisasi_log_updater", fields: [diperbarui_oleh], references: [user_id])|
|`zona`|`zona_gudang`|@relation(fields: [zona_id], references: [zona_id], onDelete: Cascade)|



###### **Index & Constraint Tingkat Model:** 

- `@@index([zona_id])` 

- `@@index([created_at])` 

##### **12. Model** `kategori_barang` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`kategori_id`|`BigInt`|@id @default(autoincrement())|
|`nama_kategori`|`String`|@unique|
|`is_kritis`|`Boolean`|@default(false)|
|`barangs`|`barang[]`|-|



###### **Index & Constraint Tingkat Model:** 

- `@@index([nama_kategori])` 

##### **13. Model** `satuan` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`satuan_id`|`BigInt`|@id @default(autoincrement())|
|`kode_satuan`|`String`|@unique|
|`barang_defaults`|`barang[]`|@relation("BarangSatuanDefault")|
|`boq_items`|`boq_item[]`|-|
|`surat_jalan_items`|`surat_jalan_item[]`|-|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 53 

##### **14. Model** `supplier` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`supplier_id`|`BigInt`|@id @default(autoincrement())|
|`kode`|`String`|@unique @db.Text|
|`nama`|`String`|@db.Text|
|`deskripsi`|`String?`|@db.Text|
|`is_aktif`|`Boolean`|@default(true)|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@updatedAt|
|`surat_jalans`|`surat_jalan[]`|-|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 54 

##### **15. Model** `barang` 

|**Nama Kolom**<br>`barang_id`|**Tipe Data**<br>`BigInt`|**Keterangan / Constraint / Relasi**<br>@id @default(autoincrement())|
|---|---|---|
|`kode_perangkat`|`String`|@unique|
|`nama_barang`|`String`|-|
|`kategori_id`|`BigInt`|-|
|`satuan_default_id`|`BigInt`|-|
|`foto`|`String?`|-|
|`wajib_sn`|`Boolean`|@default(false)|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now())|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt`|-|
|`creator`|`user_account`|@relation("barang_created_by", fields: [created_by], references: [user_id])|
|`kategori`|`kategori_barang`|@relation(fields: [kategori_id], references: [kategori_id])|
|`satuan_default`|`satuan`|@relation("BarangSatuanDefault", fields: [satuan_default_id], references: [satuan_id])|
|`updater`|`user_account`|@relation("barang_updated_by", fields: [updated_by], references: [user_id])|
|`boq_items`|`boq_item[]`|-|
|`permintaan_boqs`|`permintaan_boq[]`|-|
|`stok_gudangs`|`stok_gudang[]`|-|
|`stok_ledgers`|`stok_ledger[]`|-|
|`surat_jalan_items`|`surat_jalan_item[]`|-|
|`laporan_mitras`|`laporan_mitra[]`|@relation("LaporanMitraBarang")|
|`reconciliation_upload_details`|`reconciliation_upload_detail[]`|@relation("ReconciliationUploadDetailBarang")|
|`return_transactions`|`return_transaction[]`|-|
|`additional_adjustments`|`additional_adjustment[]`|-|
|`reconciliation_remains_notes`|`reconciliation_remains_note[]`|-|



###### **Index & Constraint Tingkat Model:** 

- `@@index([kode_perangkat])` 

- `@@index([kategori_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 55 

##### **16. Model** `tiket_material` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`tiket_id`|`BigInt`|@id @default(autoincrement())|
|`kode_tiket`|`String`|@unique @db.Text|
|`project_id`|`BigInt`|-|
|`cluster_id`|`String?`|@db.Text|
|`area`|`String?`|@db.Text|
|`mos`|`Decimal?`|@db.Decimal(14, 2)|
|`used`|`Decimal?`|@db.Decimal(14, 2)|
|`used_terpasang`|`Decimal?`|@db.Decimal(14, 2)|
|`created_at`|`DateTime`|@default(now())|
|`created_by`|`BigInt`|-|
|`boq`|`boq?`|-|
|`permintaan_boqs`|`permintaan_boq[]`|-|
|`laporans`|`laporan_mitra[]`|@relation("LaporanMitraTiket")|
|`return_transactions`|`return_transaction[]`|-|
|`cluster`|`cluster?`|@relation("ClusterTiket", fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|
|`creator`|`user_account`|@relation("tiket_material_created_by", fields: [created_by], references: [user_id])|
|`project`|`project`|@relation(fields: [project_id], references: [project_id])|



###### **Index & Constraint Tingkat Model:** 

- `@@index([project_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 56 

##### **17. Model** `boq` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`boq_id`|`BigInt`|@id @default(autoincrement())|
|`tiket_id`|`BigInt?`|@unique|
|`cluster_id`|`String`|@db.Text|
|`boq_number`|`String?`|@unique|
|`status`|`boq_status`|@default(draft)|
|`source`|`boq_source`|@default(top_down)|
|`external_verification_status`|`external_verification_status`|@default(menunggu)|
|`tanggal_aktivasi`|`DateTime?`|-|
|`diaktifkan_oleh`|`BigInt?`|-|
|`catatan`|`String?`|-|
|`reference_file`|`String?`|-|
|`email_reference`|`String?`|-|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now()) @updatedAt|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt`|-|
|`creator`|`user_account`|@relation("boq_created_by", fields: [created_by], references: [user_id])|
|`diaktifkan_user`|`user_account?`|@relation("boq_diaktifkan", fields: [diaktifkan_oleh], references: [user_id])|
|`cluster`|`cluster`|@relation(fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|
|`tiket`|`tiket_material?`|@relation(fields: [tiket_id], references: [tiket_id])|
|`updater`|`user_account`|@relation("boq_updated_by", fields: [updated_by], references: [user_id])|
|`items`|`boq_item[]`|-|
|`surat_jalans`|`surat_jalan[]`|-|



###### **Index & Constraint Tingkat Model:** 

- `@@index([status])` 

- `@@index([boq_number])` 

- `@@index([cluster_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 57 

##### **18. Model** `boq_item` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`boq_item_id`|`BigInt`|@id @default(autoincrement())|
|`boq_id`|`BigInt`|-|
|`barang_id`|`BigInt`|-|
|`qty_rencana`|`Decimal`|@db.Decimal(14, 2)|
|`qty_additional`|`Decimal?`|@db.Decimal(14, 2)|
|`qty_mos`|`Decimal?`|@db.Decimal(14, 2)|
|`qty_used`|`Decimal?`|@db.Decimal(14, 2)|
|`satuan_id`|`BigInt?`|-|
|`gudang_tujuan_id`|`BigInt?`|-|
|`cluster_id`|`String?`|@db.Text|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@updatedAt|
|`barang`|`barang`|@relation(fields: [barang_id], references: [barang_id])|
|`boq`|`boq`|@relation(fields: [boq_id], references: [boq_id], onDelete: Cascade)|
|`cluster`|`cluster?`|@relation(fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|
|`gudang_tujuan`|`gudang?`|@relation(fields: [gudang_tujuan_id], references: [gudang_id])|
|`satuan`|`satuan?`|@relation(fields: [satuan_id], references: [satuan_id])|



###### **Index & Constraint Tingkat Model:** 

- `@@index([boq_id])` 

- `@@index([barang_id])` 

- `@@index([satuan_id])` 

- `@@index([gudang_tujuan_id])` 

- `@@index([cluster_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 58 

##### **19. Model** `permintaan_boq` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`permintaan_id`|`BigInt`|@id @default(autoincrement())|
|`project_id`|`BigInt`|-|
|`tiket_id`|`BigInt?`|-|
|`barang_id`|`BigInt`|-|
|`qty_usulan`|`Decimal`|@db.Decimal(14, 2)|
|`alasan`|`String?`|-|
|`status`|`permintaan_boq_status`|@default(diajukan)|
|`diajukan_oleh`|`BigInt`|-|
|`ditinjau_oleh`|`BigInt?`|-|
|`cluster_id`|`String?`|@db.Text|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now())|
|`barang`|`barang`|@relation(fields: [barang_id], references: [barang_id])|
|`diajukan_user`|`personil`|@relation("permintaan_diajukan_oleh", fields: [diajukan_oleh], references: [personil_id])|
|`ditinjau_user`|`personil?`|@relation("permintaan_ditinjai_oleh", fields: [ditinjau_oleh], references: [personil_id])|
|`project`|`project`|@relation(fields: [project_id], references: [project_id])|
|`tiket`|`tiket_material?`|@relation(fields: [tiket_id], references: [tiket_id])|
|`cluster`|`cluster?`|@relation(fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|



###### **Index & Constraint Tingkat Model:** 

- `@@index([project_id])` 

- `@@index([status])` 

- `@@index([cluster_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 59 

##### **20. Model** `surat_jalan` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`surat_jalan_id`|`BigInt`|@id @default(autoincrement())|
|`nomor_surat_jalan`|`String`|@unique|
|`tipe`|`surat_jalan_tipe`|-|
|`boq_id`|`BigInt?`|-|
|`gudang_asal_id`|`BigInt?`|-|
|`gudang_tujuan_id`|`BigInt?`|-|
|`cluster_id`|`String?`|@db.Text|
|`kendaraan_id`|`BigInt?`|-|
|`personil_pengantar_id`|`BigInt?`|-|
|`kendaraan_nama_teks`|`String?`|@db.Text|
|`kendaraan_jenis_teks`|`String?`|@db.Text|
|`kendaraan_no_polisi_teks`|`String?`|@db.Text|
|`driver_nama_teks`|`String?`|@db.Text|
|`status`|`surat_jalan_status`|@default(draft_diajukan)|
|`kategori_approval`|`String?`|-|
|`pic_pemohon_nama`|`String?`|-|
|`tanggal`|`DateTime`|@default(now())|
|`tanggal_disetujui`|`DateTime?`|-|
|`tanggal_digenerate`|`DateTime?`|-|
|`tanggal_diterima`|`DateTime?`|-|
|`estimasi_tiba`|`DateTime?`|-|
|`catatan_distribusi`|`String?`|@db.Text|
|`surat_jalan_url`|`String?`|-|
|`catatan`|`String?`|-|
|`picking_selesai`|`Boolean`|@default(false)|
|`project_id`|`BigInt?`|-|
|`titik_lapangan_id`|`BigInt?`|-|
|`tujuan_tipe`|`tujuan_tipe_enum?`|-|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 60 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`tipe_pengirim`|`tipe_pengirim_enum?`|-|
|`pengirim_eksternal_nama`|`String?`|-|
|`supplier_id`|`BigInt?`|-|
|`supplier`|`supplier?`|@relation(fields: [supplier_id], references: [supplier_id])|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@default(now())|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt`|-|
|`dilaporkan_tiba_oleh`|`BigInt?`|-|
|`dilaporkan_tiba_at`|`DateTime?`|-|
|`catatan_tiba`|`String?`|@db.Text|
|`dikonfirmasi_oleh`|`BigInt?`|-|
|`dikonfirmasi_at`|`DateTime?`|-|
|`bukti_tiba_url`|`String?`|-|
|`boq`|`boq?`|@relation(fields: [boq_id], references: [boq_id])|
|`cluster`|`cluster?`|@relation(fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|
|`creator`|`user_account`|@relation("surat_jalan_created_by", fields: [created_by], references: [user_id])|
|`gudang_asal`|`gudang?`|@relation("surat_jalan_asal", fields: [gudang_asal_id], references: [gudang_id])|
|`gudang_tujuan`|`gudang?`|@relation("surat_jalan_tujuan", fields: [gudang_tujuan_id], references: [gudang_id])|
|`kendaraan`|`kendaraan?`|@relation(fields: [kendaraan_id], references: [kendaraan_id])|
|`personil_pengantar`|`personil?`|@relation(fields: [personil_pengantar_id], references: [personil_id])|
|`project`|`project?`|@relation(fields: [project_id], references: [project_id])|
|`titik_lapangan`|`titik_lapangan?`|@relation(fields: [titik_lapangan_id], references: [titik_lapangan_id])|
|`alamat_lapangan`|`String?`|-|
|`updater`|`user_account`|@relation("surat_jalan_updated_by", fields: [updated_by], references: [user_id])|
|`dilaporkan_tiba`|`user_account?`|@relation("surat_jalan_dilaporkan_tiba_oleh", fields: [dilaporkan_tiba_oleh], references: [user_id])|
|`dikonfirmasi_tiba`|`user_account?`|@relation("surat_jalan_dikonfirmasi_oleh", fields: [dikonfirmasi_oleh], references: [user_id])|
|`items`|`surat_jalan_item[]`|-|
|`transit_checkpoints`|`surat_jalan_transit[]`|-|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 61 

###### **Index & Constraint Tingkat Model:** 

- `@@index([status])` 

- `@@index([project_id])` 

- `@@index([tipe])` 

- `@@index([created_at])` 

- `@@index([cluster_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 62 

##### **21. Model** `surat_jalan_item` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`item_id`|`BigInt`|@id @default(autoincrement())|
|`surat_jalan_id`|`BigInt`|-|
|`barang_id`|`BigInt`|-|
|`qty`|`Decimal`|@db.Decimal(14, 2)|
|`satuan_id`|`BigInt`|-|
|`kondisi`|`kondisi_barang?`|-|
|`serial_number`|`String?`|-|
|`foto_url`|`String?`|-|
|`is_kelebihan`|`Boolean`|@default(false)|
|`is_di_luar_boq`|`Boolean`|@default(false)|
|`cluster_id`|`String?`|@db.Text|
|`catatan`|`String?`|-|
|`qty_diterima`|`Decimal?`|@db.Decimal(14, 2)|
|`qty_ditolak`|`Decimal?`|@db.Decimal(14, 2)|
|`alasan_penolakan`|`String?`|@db.Text|
|`kondisi_diterima`|`kondisi_barang?`|-|
|`catatan_penerimaan`|`String?`|@db.Text|
|`zona_id`|`BigInt?`|-|
|`diperiksa_oleh`|`BigInt?`|-|
|`diperiksa_pada`|`DateTime?`|-|
|`created_at`|`DateTime`|@default(now())|
|`stok_ledgers`|`stok_ledger[]`|-|
|`barang`|`barang`|@relation(fields: [barang_id], references: [barang_id])|
|`satuan`|`satuan`|@relation(fields: [satuan_id], references: [satuan_id])|
|`surat_jalan`|`surat_jalan`|@relation(fields: [surat_jalan_id], references: [surat_jalan_id], onDelete: Cascade)|
|`cluster`|`cluster?`|@relation(fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|
|`zona`|`zona_gudang?`|@relation(fields: [zona_id], references: [zona_id])|
|`diperiksa_oleh_user`|`user_account?`|@relation("SuratJalanItemDiperiksaOleh", fields: [diperiksa_oleh], references: [user_id])|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 63 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`fotos`|`surat_jalan_item_foto[]`|-|
|`return_transactions`|`return_transaction[]`|-|
|`picks`|`surat_jalan_item_pick[]`|-|
|`units`|`surat_jalan_item_unit[]`|-|



###### **Index & Constraint Tingkat Model:** 

- `@@index([surat_jalan_id])` 

- `@@index([barang_id])` 

- `@@index([cluster_id])` 

##### **22. Model** `surat_jalan_item_foto` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`foto_id`|`BigInt`|@id @default(autoincrement())|
|`item_id`|`BigInt`|-|
|`url`|`String`|-|
|`filename`|`String?`|-|
|`mimetype`|`String?`|-|
|`ukuran_bytes`|`BigInt?`|-|
|`created_at`|`DateTime`|@default(now())|
|`item`|`surat_jalan_item`|@relation(fields: [item_id], references: [item_id], onDelete: Cascade)|



###### **Index & Constraint Tingkat Model:** 

- `@@index([item_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 64 

##### **23. Model** `surat_jalan_item_pick` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`pick_id`|`BigInt`|@default(autoincrement())|
|`surat_jalan_item_id`|`BigInt`|-|
|`gudang_id`|`BigInt`|-|
|`zona_id`|`BigInt?`|-|
|`kondisi_diminta`|`kondisi_barang`|-|
|`kondisi_diambil`|`kondisi_barang`|-|
|`qty`|`Decimal`|@db.Decimal(14, 2)|
|`is_override`|`Boolean`|@default(false)|
|`catatan_override`|`String?`|@db.Text|
|`picked_by`|`BigInt?`|-|
|`picked_at`|`DateTime`|@default(now())|
|`item`|`surat_jalan_item`|@relation(fields: [surat_jalan_item_id], references: [item_id], onDelete: Restrict)|



###### **Index & Constraint Tingkat Model:** 

- `@@id([pick_id], map: "surat_jalan_item_pick_pick_id_pkey")` 

- `@@index([surat_jalan_item_id], map: "surat_jalan_item_pick_surat_jalan_item_id_idx")` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 65 

##### **24. Model** `surat_jalan_transit` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`transit_id`|`BigInt`|@id @default(autoincrement())|
|`surat_jalan_id`|`BigInt`|-|
|`gudang_id`|`BigInt`|-|
|`urutan`|`Int`|-|
|`tiba_at`|`DateTime`|@default(now())|
|`tiba_by`|`BigInt`|-|
|`berangkat_at`|`DateTime?`|-|
|`berangkat_by`|`BigInt?`|-|
|`catatan_tiba`|`String?`|@db.Text|
|`catatan_berangkat`|`String?`|@db.Text|
|`bukti_url`|`String?`|@db.Text|
|`items`|`Json`|-|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@updatedAt|
|`surat_jalan`|`surat_jalan`|@relation(fields: [surat_jalan_id], references: [surat_jalan_id], onDelete: Cascade)|
|`gudang`|`gudang`|@relation("gudang_transit", fields: [gudang_id], references: [gudang_id])|
|`tiba_oleh`|`user_account`|@relation("surat_jalan_transit_tiba_oleh", fields: [tiba_by], references: [user_id])|
|`berangkat_oleh`|`user_account?`|@relation("surat_jalan_transit_berangkat_oleh", fields: [berangkat_by], references: [user_id])|



###### **Index & Constraint Tingkat Model:** 

- `@@unique([surat_jalan_id, urutan])` 

- `@@index([surat_jalan_id, berangkat_at])` 

- `@@index([gudang_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 66 

##### **25. Model** `surat_jalan_item_unit` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`unit_id`|`BigInt`|@id @default(autoincrement())|
|`surat_jalan_item_id`|`BigInt`|-|
|`nomor_unit`|`Int`|-|
|`kondisi`|`kondisi_barang`|-|
|`catatan`|`String?`|@db.Text|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@updatedAt|
|`item`|`surat_jalan_item`|@relation(fields: [surat_jalan_item_id], references: [item_id], onDelete: Cascade)|



###### **Index & Constraint Tingkat Model:** 

- `@@unique([surat_jalan_item_id, nomor_unit], map: "surat_jalan_item_unit_item_nomor_unit_key")` 

- `@@index([surat_jalan_item_id], map: "surat_jalan_item_unit_surat_jalan_item_id_idx")` 

##### **26. Model** `stok_gudang` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`stok_id`|`BigInt`|@id @default(autoincrement())|
|`gudang_id`|`BigInt`|-|
|`zona_id`|`BigInt?`|-|
|`barang_id`|`BigInt`|-|
|`project_id`|`BigInt?`|-|
|`kondisi`|`kondisi_barang`|@default(baik)|
|`qty`|`Decimal`|@default(0) @db.Decimal(14, 2)|
|`updated_at`|`DateTime`|@default(now())|
|`barang`|`barang`|@relation(fields: [barang_id], references: [barang_id])|
|`gudang`|`gudang`|@relation(fields: [gudang_id], references: [gudang_id])|
|`project`|`project?`|@relation(fields: [project_id], references: [project_id])|
|`zona`|`zona_gudang?`|@relation(fields: [zona_id], references: [zona_id])|



###### **Index & Constraint Tingkat Model:** 

- `@@unique([gudang_id, zona_id, barang_id, project_id, kondisi])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 67 

- `@@index([gudang_id, barang_id])` 

- `@@index([project_id])` 

- `@@index([zona_id])` 

##### **27. Model** `stok_ledger` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`ledger_id`|`BigInt`|@id @default(autoincrement())|
|`surat_jalan_item_id`|`BigInt?`|-|
|`return_transaction_id`|`BigInt?`|-|
|`barang_id`|`BigInt`|-|
|`cluster_id`|`String?`|@db.Text|
|`jenis_mutasi`|`mutasi_jenis`|-|
|`qty`|`Decimal`|@db.Decimal(14, 2)|
|`saldo_setelah`|`Decimal`|@db.Decimal(14, 2)|
|`waktu_mutasi`|`DateTime`|@default(now())|
|`barang`|`barang`|@relation(fields: [barang_id], references: [barang_id])|
|`surat_jalan_item`|`surat_jalan_item?`|@relation(fields: [surat_jalan_item_id], references: [item_id])|
|`return_transaction`|`return_transaction?`|@relation(fields: [return_transaction_id], references: [return_id], onDelete: SetNull)|
|`cluster`|`cluster?`|@relation(fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|



###### **Index & Constraint Tingkat Model:** 

- `@@index([barang_id, waktu_mutasi])` 

- `@@index([surat_jalan_item_id])` 

- `@@index([return_transaction_id])` 

- `@@index([cluster_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 68 

##### **28. Model** `additional_adjustment` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`adjustment_id`|`BigInt`|@id @default(autoincrement())|
|`project_id`|`BigInt`|-|
|`cluster_id`|`String?`|@db.Text|
|`barang_id`|`BigInt`|-|
|`qty`|`Int`|-|
|`alasan`|`String`|@db.Text|
|`created_by`|`BigInt`|-|
|`created_at`|`DateTime`|@default(now())|
|`project`|`project`|@relation(fields: [project_id], references: [project_id])|
|`cluster`|`cluster?`|@relation(fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|
|`barang`|`barang`|@relation(fields: [barang_id], references: [barang_id])|
|`creator`|`user_account`|@relation(fields: [created_by], references: [user_id])|



###### **Index & Constraint Tingkat Model:** 

- `@@index([project_id, barang_id])` 

- `@@index([cluster_id, barang_id])` 

- `@@index([created_by])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 69 

##### **29. Model** `reconciliation_remains_note` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`id`|`BigInt`|@id @default(autoincrement())|
|`project_id`|`BigInt`|-|
|`cluster_id`|`String?`|@db.Text|
|`barang_id`|`BigInt`|-|
|`keterangan`|`String`|@db.Text|
|`created_by`|`BigInt`|-|
|`updated_by`|`BigInt?`|-|
|`created_at`|`DateTime`|@default(now())|
|`updated_at`|`DateTime`|@updatedAt|
|`project`|`project`|@relation(fields: [project_id], references: [project_id])|
|`cluster`|`cluster?`|@relation(fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|
|`barang`|`barang`|@relation(fields: [barang_id], references: [barang_id])|
|`created_by_user`|`user_account`|@relation("ReconciliationRemainsNoteCreatedBy", fields: [created_by], references: [user_id])|
|`updated_by_user`|`user_account?`|@relation("ReconciliationRemainsNoteUpdatedBy", fields: [updated_by], references: [user_id])|



###### **Index & Constraint Tingkat Model:** 

- `@@index([project_id, barang_id])` 

- `@@index([cluster_id, barang_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 70 

##### **30. Model** `approval_log` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`approval_id`|`BigInt`|@id @default(autoincrement())|
|`entity_type`|`approval_entity_type`|-|
|`entity_id`|`BigInt`|-|
|`tahap`|`approval_tahap`|-|
|`status`|`approval_status`|@default(menunggu)|
|`approver_id`|`BigInt?`|-|
|`catatan`|`String?`|-|
|`created_at`|`DateTime`|@default(now())|
|`approver`|`user_account?`|@relation(fields: [approver_id], references: [user_id])|



###### **Index & Constraint Tingkat Model:** 

- `@@index([entity_type, entity_id])` 

##### **31. Model** `audit_log` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`audit_id`|`BigInt`|@id @default(autoincrement())|
|`entity_type`|`String`|-|
|`entity_id`|`BigInt`|-|
|`aksi`|`audit_aksi`|-|
|`actor_id`|`BigInt`|-|
|`data_sebelum`|`Json?`|-|
|`data_sesudah`|`Json?`|-|
|`created_at`|`DateTime`|@default(now())|
|`actor`|`user_account`|@relation(fields: [actor_id], references: [user_id])|



###### **Index & Constraint Tingkat Model:** 

- `@@index([entity_type, entity_id])` 

- `@@index([actor_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 71 

##### **32. Model** `reconciliation_upload_log` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`upload_id`|`BigInt`|@id @default(autoincrement())|
|`filename`|`String`|-|
|`file_url`|`String?`|-|
|`uploaded_by`|`BigInt`|-|
|`uploaded_at`|`DateTime`|@default(now())|
|`total_rows`|`Int`|-|
|`success_rows`|`Int`|-|
|`failed_rows`|`Int`|-|
|`actor`|`user_account`|@relation("ReconciliationUploadLogActor", fields: [uploaded_by], references: [user_id])|
|`details`|`reconciliation_upload_detail[]`|@relation("ReconciliationUploadLogDetail")|



###### **Index & Constraint Tingkat Model:** 

- `@@index([uploaded_at])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 72 

##### **33. Model** `reconciliation_upload_detail` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`detail_id`|`BigInt`|@id @default(autoincrement())|
|`upload_id`|`BigInt`|-|
|`kode_tiket`|`String`|-|
|`barang_id`|`BigInt?`|-|
|`mos`|`Decimal`|@db.Decimal(14, 2)|
|`used`|`Decimal`|@db.Decimal(14, 2)|
|`remains_lapangan`|`Decimal?`|@db.Decimal(14, 2)|
|`status`|`reconciliation_detail_status`|-|
|`reason`|`String?`|-|
|`kondisi`|`kondisi_barang?`|-|
|`catatan`|`String?`|@db.Text|
|`nama_barang`|`String?`|@db.Text|
|`kode_barang`|`String?`|@db.Text|
|`project_nama`|`String?`|@db.Text|
|`tanggal_laporan`|`DateTime?`|-|
|`pic_mitra`|`String?`|@db.Text|
|`upload_log`|`reconciliation_upload_log`|@relation("ReconciliationUploadLogDetail", fields: [upload_id], references: [upload_id], onDelete: Cascade)|
|`barang`|`barang?`|@relation("ReconciliationUploadDetailBarang", fields: [barang_id], references: [barang_id], onDelete: SetNull)|



###### **Index & Constraint Tingkat Model:** 

- `@@index([upload_id])` 

- `@@index([barang_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 73 

##### **34. Model** `laporan_mitra` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`laporan_id`|`BigInt`|@id @default(autoincrement())|
|`tiket_id`|`BigInt`|-|
|`kode_tiket`|`String`|@db.Text|
|`project_id`|`BigInt`|-|
|`jenis_laporan`|`jenis_laporan_enum`|-|
|`tanggal_laporan`|`DateTime`|@db.Date|
|`pic_mitra`|`String?`|@db.Text|
|`nama_barang`|`String?`|@db.Text|
|`barang_id`|`BigInt?`|-|
|`mos`|`Decimal`|@db.Decimal(14, 2)|
|`used`|`Decimal`|@db.Decimal(14, 2)|
|`remains_lapangan`|`Decimal?`|@db.Decimal(14, 2)|
|`catatan`|`String?`|@db.Text|
|`kondisi`|`String?`|@db.Text|
|`cluster_id`|`String?`|@db.Text|
|`uploaded_by`|`BigInt`|-|
|`uploaded_at`|`DateTime`|@default(now())|
|`is_aktif`|`Boolean`|@default(true)|
|`tiket`|`tiket_material`|@relation("LaporanMitraTiket", fields: [tiket_id], references: [tiket_id])|
|`project`|`project`|@relation("LaporanMitraProject", fields: [project_id], references: [project_id])|
|`barang`|`barang?`|@relation("LaporanMitraBarang", fields: [barang_id], references: [barang_id], onDelete: SetNull)|
|`cluster`|`cluster?`|@relation("ClusterLaporan", fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|
|`uploader`|`user_account`|@relation("LaporanMitraUploader", fields: [uploaded_by], references: [user_id])|
|`return_baselines`|`return_transaction[]`|@relation("ReturnBaselineLaporan")|



###### **Index & Constraint Tingkat Model:** 

- `@@index([tiket_id])` 

- `@@index([project_id])` 

- `@@index([tanggal_laporan])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 74 

- `@@index([barang_id])` 

- `@@index([uploaded_at])` 

- `@@index([cluster_id])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 75 

##### **35. Model** `return_transaction` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`return_id`|`BigInt`|@id @default(autoincrement())|
|`tiket_id`|`BigInt`|-|
|`project_id`|`BigInt`|-|
|`barang_id`|`BigInt`|-|
|`baseline_laporan_id`|`BigInt`|-|
|`surat_jalan_item_id`|`BigInt?`|-|
|`cluster_id`|`String?`|@db.Text|
|`qty`|`Decimal`|@db.Decimal(14, 2)|
|`status`|`return_status`|@default(draft)|
|`effective_return_at`|`DateTime`|-|
|`created_by`|`BigInt`|-|
|`created_at`|`DateTime`|@default(now())|
|`approved_by`|`BigInt?`|-|
|`approved_at`|`DateTime?`|-|
|`received_by`|`BigInt?`|-|
|`received_at`|`DateTime?`|-|
|`note`|`String?`|@db.Text|
|`reason`|`String?`|@db.Text|
|`tiket`|`tiket_material`|@relation(fields: [tiket_id], references: [tiket_id])|
|`project`|`project`|@relation(fields: [project_id], references: [project_id])|
|`barang`|`barang`|@relation(fields: [barang_id], references: [barang_id])|
|`baseline_laporan`|`laporan_mitra`|@relation("ReturnBaselineLaporan", fields: [baseline_laporan_id], references: [laporan_id], onDelete: Restrict)|
|`surat_jalan_item`|`surat_jalan_item?`|@relation(fields: [surat_jalan_item_id], references: [item_id], onDelete: SetNull)|
|`cluster`|`cluster?`|@relation("ReturnCluster", fields: [cluster_id], references: [cluster_id], onDelete: Restrict)|
|`creator`|`user_account`|@relation("ReturnCreatedBy", fields: [created_by], references: [user_id])|
|`approver`|`user_account?`|@relation("ReturnApprovedBy", fields: [approved_by], references: [user_id])|
|`receiver`|`user_account?`|@relation("ReturnReceivedBy", fields: [received_by], references: [user_id])|
|`stok_ledgers`|`stok_ledger[]`|-|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 76 

###### **Index & Constraint Tingkat Model:** 

- `@@index([tiket_id, barang_id, status, effective_return_at])` 

- `@@index([baseline_laporan_id])` 

- `@@index([surat_jalan_item_id])` 

- `@@index([created_at])` 

- `@@index([cluster_id])` 

##### **36. Model** `notification` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`id`|`BigInt`|@id @default(autoincrement())|
|`user_id`|`BigInt?`|-|
|`role`|`user_role?`|-|
|`type`|`notification_type`|@default(info)|
|`title`|`String`|@db.Text|
|`message`|`String`|@db.Text|
|`link`|`String?`|@db.Text|
|`is_read`|`Boolean`|@default(false)|
|`read_at`|`DateTime?`|-|
|`created_at`|`DateTime`|@default(now())|
|`user`|`user_account?`|@relation(fields: [user_id], references: [user_id])|



###### **Index & Constraint Tingkat Model:** 

- `@@index([user_id, is_read])` 

- `@@index([role, is_read])` 

- `@@index([created_at])` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 77 

##### **37. Model** `password_reset_token` 

|**Nama Kolom**|**Tipe Data**|**Keterangan / Constraint / Relasi**|
|---|---|---|
|`id`|`String`|@id|
|`email`|`String`|-|
|`token`|`String`|@unique|
|`expires`|`DateTime`|-|
|`createdAt`|`DateTime`|@default(now())|



###### **Index & Constraint Tingkat Model:** 

- `@@map("password_resets")` 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 78 

## **Lampiran B: Spesifikasi API** 

**Dokumen Pendukung PRD** — Bab 11 (Spesifikasi API Endpoint) **Base URL:** `http://localhost:5000` (atau konfigurasi `PORT` di backend `.env` ) **Total Terdaftar:** 184 Endpoint **Format Standar Respons Sukses:** `{ success: true, message?: string, data: ... }` **Format Standar Respons Error:** `{ success: false, message: string, errors?: Array }` **Kode Error Umum:** `400` (Validasi Zod gagal), `401` (Unauthorized/Token kadaluarsa), `403` (Forbidden/Role tidak sesuai), `404` (Data tidak ditemukan), `500` (Internal Server Error) 

Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 79 

#### **B.1 Ringkasan Endpoint per Modul** 

|**Modul**|**Jumlah Endpoint**|
|---|---|
|System Root|1|
|Penyesuaian Tambahan (Adjustment)|2|
|Aisle (Lorong)|6|
|Autentikasi|8|
|Bill of Quantity (BOQ)|18|
|Kategori Barang|6|
|Cluster Proyek|6|
|Customer|6|
|Dashboard|7|
|Barang / Material|5|
|Notifikasi In-App|6|
|Permintaan BOQ Tambahan|7|
|Personil|5|
|Profil Pengguna|2|
|Proyek|7|
|Rekonsiliasi Lapangan|3|
|Laporan & Rekonsiliasi|14|
|Pengaturan Sistem|4|
|Supplier|6|
|Surat Jalan & Distribusi|23|
|Titik Lapangan|6|
|Satuan|6|
|File Upload|2|
|Manajemen Pengguna|6|
|Kendaraan|5|
|Gudang|11|
|Zona Gudang<br>**TOTAL**|6<br>**184**|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 80 

#### **B.2 Daftar Lengkap Endpoint API** 

##### **Modul: System Root (1 Endpoint)** 

File sumber: `backend/src/app.js:71` 

|**Method**<br>**Path**<br>**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|
|`GET`<br>`/`<br>Public|`res.json({ success: true, message: "Digitak Warehouse API" })`|



##### **Modul: Penyesuaian Tambahan (Adjustment) (2 Endpoint)** 

File sumber: `backend/src/modules/additional/additional.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/additional-adjustments`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`additionalController.create`|
|`GET`|`/api/additional-adjustments`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`additionalController.list`|



##### **Modul: Aisle (Lorong) (6 Endpoint)** 

File sumber: `backend/src/modules/aisle/aisle.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/aisles`|JWT Authenticated [Role: ADMIN]|`aisleController.create`|
|`GET`|`/api/aisles`|JWT Authenticated [All Roles]|`aisleController.findAll`|
|`GET`|`/api/aisles/:code`|JWT Authenticated [All Roles]|`aisleController.findByCode`|
|`PUT`|`/api/aisles/:code`|JWT Authenticated [Role: ADMIN]|`aisleController.update`|
|`DELETE`|`/api/aisles/:code`|JWT Authenticated [Role: ADMIN]|`aisleController.softDelete`|
|`PATCH`|`/api/aisles/:code/restore`|JWT Authenticated [Role: ADMIN]|`aisleController.restore`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 81 

##### **Modul: Autentikasi (8 Endpoint)** 

File sumber: `backend/src/modules/auth/auth.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/auth/login`|Public|`authController.login`|
|`POST`|`/api/auth/forgot-password`|Public|`authController.forgotPassword`|
|`POST`|`/api/auth/reset-password`|Public|`authController.resetPassword`|
|`PUT`|`/api/auth/change-password`|JWT Authenticated [All Roles]|`authController.changePassword`|
|`POST`|`/api/auth/refresh`|Public|`authController.refresh`|
|`POST`|`/api/auth/logout`|JWT Authenticated [All Roles]|`authController.logout`|
|`GET`|`/api/auth/me`|JWT Authenticated [All Roles]|`authController.me`|
|`GET`|`/api/auth/admin`|JWT Authenticated [Role: ADMIN]|Inline handler (mengembalikan data`req.user`)|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 82 

##### **Modul: Bill of Quantity (BOQ) (18 Endpoint)** 

File sumber: `backend/src/modules/boq/boq.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/boqs`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`boqController.create`|
|`GET`|`/api/boqs`|JWT Authenticated [All Roles]|`boqController.findAll`|
|`GET`|`/api/boqs/stats`|JWT Authenticated [All Roles]|`boqController.getStats`|
|`GET`|`/api/boqs/areas`|JWT Authenticated [All Roles]|`boqController.getAreas`|
|`GET`|`/api/boqs/items`|JWT Authenticated [All Roles]|`boqController.getItems`|
|`GET`|`/api/boqs/check-ticket`|JWT Authenticated [All Roles]|`boqController.checkTicketAvailability`|
|`GET`|`/api/boqs/export`|JWT Authenticated [All Roles]|`boqController.exportBoqs`|
|`GET`|`/api/boqs/export-matrix`|JWT Authenticated [All Roles]|`boqController.exportMatrixExcel`|
|`GET`|`/api/boqs/:id`|JWT Authenticated [All Roles]|`boqController.findById`|
|`GET`|`/api/boqs/:id/summary`|JWT Authenticated [All Roles]|`boqController.getSummary`|
|`PUT`|`/api/boqs/:id`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`boqController.update`|
|`PUT`|`/api/boqs/:id/status`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`boqController.updateStatus`|
|`PATCH`|`/api/boqs/:id/status`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`boqController.updateStatus`|
|`PUT`|`/api/boqs/:id/verification`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`boqController.update`|
|`PATCH`|`/api/boqs/:id/verification`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`boqController.update`|
|`DELETE`|`/api/boqs/:id`|JWT Authenticated [Role: ADMIN]|`boqController.softDelete`|
|`PUT`|`/api/boqs/:id/restore`|JWT Authenticated [Role: ADMIN]|`boqController.restore`|
|`PATCH`|`/api/boqs/:id/restore`|JWT Authenticated [Role: ADMIN]|`boqController.restore`|



##### **Modul: Kategori Barang (6 Endpoint)** 

File sumber: `backend/src/modules/category/category.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/categories`|JWT Authenticated [Role: ADMIN]|`categoryController.create`|
|`GET`|`/api/categories`|JWT Authenticated [All Roles]|`categoryController.findAll`|
|`GET`|`/api/categories/:code`|JWT Authenticated [All Roles]|`categoryController.findByCode`|
|`PUT`|`/api/categories/:code`|JWT Authenticated [Role: ADMIN]|`categoryController.update`|
|`DELETE`|`/api/categories/:code`|JWT Authenticated [Role: ADMIN]|`categoryController.softDelete`|
|`PATCH`|`/api/categories/:code/restore`|JWT Authenticated [Role: ADMIN]|`categoryController.restore`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 83 

##### **Modul: Cluster Proyek (6 Endpoint)** 

File sumber: `backend/src/modules/cluster/cluster.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`GET`|`/api/clusters`|JWT Authenticated [All Roles]|`clusterController.listByProject`|
|`GET`|`/api/clusters/all`|JWT Authenticated [All Roles]|`clusterController.listAll`|
|`POST`|`/api/clusters`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`clusterController.create`|
|`PUT`|`/api/clusters/:clusterId`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`clusterController.update`|
|`PATCH`|`/api/clusters/:clusterId/toggle-status`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`clusterController.toggleStatus`|
|`DELETE`|`/api/clusters/:clusterId`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`clusterController.deleteCluster`|



##### **Modul: Customer (6 Endpoint)** 

File sumber: `backend/src/modules/customer/customer.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/customers`|JWT Authenticated [Role: ADMIN]|`customerController.create`|
|`GET`|`/api/customers`|JWT Authenticated [All Roles]|`customerController.findAll`|
|`GET`|`/api/customers/:code`|JWT Authenticated [All Roles]|`customerController.findByCode`|
|`PUT`|`/api/customers/:code`|JWT Authenticated [Role: ADMIN]|`customerController.update`|
|`DELETE`|`/api/customers/:code`|JWT Authenticated [Role: ADMIN]|`customerController.softDelete`|
|`PATCH`|`/api/customers/:code/restore`|JWT Authenticated [Role: ADMIN]|`customerController.restore`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 84 

##### **Modul: Dashboard (7 Endpoint)** 

File sumber: `backend/src/modules/dashboard/dashboard.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`GET`|`/api/dashboard`|JWT Authenticated [All Roles]|`dashboardController.getStats`|
|`GET`|`/api/dashboard/project-summary`|JWT Authenticated [All Roles]|`dashboardController.getProjectSummary`|
|`GET`|`/api/dashboard/approvals`|JWT Authenticated [All Roles]|`dashboardController.getApprovalQueue`|
|`GET`|`/api/dashboard/reconciliation`|JWT Authenticated [All Roles]|`dashboardController.getHardwareReconciliation`|
|`GET`|`/api/dashboard/activities`|JWT Authenticated [All Roles]|`dashboardController.getActivityLog`|
|`GET`|`/api/dashboard/warehouse-assessment`|JWT Authenticated [All Roles]|[TIDAK TERBACA: teks handler terpotong pada dokumen sumber]|
|`PUT`|`/api/dashboard/warehouse-assessment/:gudangId`|JWT Authenticated [Role: SUPERVISOR,ADMIN]|`dashboardController.updateWarehouseAssessment`|



##### **Modul: Barang / Material (5 Endpoint)** 

File sumber: `backend/src/modules/item/item.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/items`|JWT Authenticated [Role: ADMIN]|`itemController.create`|
|`GET`|`/api/items`|JWT Authenticated [All Roles]|`itemController.findAll`|
|`GET`|`/api/items/:kode_perangkat`|JWT Authenticated [All Roles]|`itemController.findByKode`|
|`PUT`|`/api/items/:kode_perangkat`|JWT Authenticated [Role: ADMIN]|`itemController.update`|
|`DELETE`|`/api/items/:id`|JWT Authenticated [Role: ADMIN]|`itemController.remove`|



##### **Modul: Notifikasi In-App (6 Endpoint)** 

File sumber: `backend/src/modules/notifications/notifications.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`GET`|`/api/notifications`|JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF]|`notificationController.list`|
|`GET`|`/api/notifications/unread-count`|JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF]|`notificationController.unreadCount`|
|`PATCH`|`/api/notifications/:id/read`|JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF]|`notificationController.markRead`|
|`PATCH`|`/api/notifications/read-all`|JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF]|`notificationController.markAllRead`|
|`DELETE`|`/api/notifications/:id`|JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF]|`notificationController.deleteOne`|
|`DELETE`|`/api/notifications`|JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF]|`notificationController.deleteMany`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 85 

##### **Modul: Permintaan BOQ Tambahan (7 Endpoint)** 

File sumber: `backend/src/modules/permintaan-boq/permintaan-boq.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/permintaan-boqs`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`permintaanBoqController.create`|
|`GET`|`/api/permintaan-boqs`|JWT Authenticated [All Roles]|`permintaanBoqController.findAll`|
|`GET`|`/api/permintaan-boqs/stats`|JWT Authenticated [All Roles]|`permintaanBoqController.getStats`|
|`GET`|`/api/permintaan-boqs/:id`|JWT Authenticated [All Roles]|`permintaanBoqController.findById`|
|`PATCH`|`/api/permintaan-boqs/:id/status`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`permintaanBoqController.updateStatus`|
|`DELETE`|`/api/permintaan-boqs/:id`|JWT Authenticated [Role: ADMIN]|`permintaanBoqController.softDelete`|
|`PATCH`|`/api/permintaan-boqs/:id/restore`|JWT Authenticated [Role: ADMIN]|`permintaanBoqController.restore`|



##### **Modul: Personil (5 Endpoint)** 

File sumber: `backend/src/modules/personnel/personnel.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/personnels`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`personnelController.create`|
|`GET`|`/api/personnels`|JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF]|`personnelController.findAll`|
|`GET`|`/api/personnels/:personil_id`|JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF]|`personnelController.findByPersonilId`|
|`PUT`|`/api/personnels/:personil_id`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`personnelController.update`|
|`DELETE`|`/api/personnels/:personil_id`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`personnelController.remove`|



##### **Modul: Profil Pengguna (2 Endpoint)** 

File sumber: `backend/src/modules/profile/profile.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`GET`|`/api/profile`|JWT Authenticated [All Roles]|`profileController.getProfile`|
|`PATCH`|`/api/profile`|JWT Authenticated [All Roles]|`profileController.updateProfile`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 86 

##### **Modul: Proyek (7 Endpoint)** 

File sumber: `backend/src/modules/projects/project.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/projects`|JWT Authenticated [Role: ADMIN]|`projectController.create`|
|`GET`|`/api/projects`|JWT Authenticated [All Roles]|`projectController.findAll`|
|`GET`|`/api/projects/:project_id`|JWT Authenticated [All Roles]|`projectController.findByProjectId`|
|`PUT`|`/api/projects/:project_id`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`projectController.update`|
|`DELETE`|`/api/projects/:project_id`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`projectController.remove`|
|`PATCH`|`/api/projects/:project_id/nonaktifkan`|JWT Authenticated [Role: ADMIN]|`projectController.nonaktifkan`|
|`PATCH`|`/api/projects/:project_id/restore`|JWT Authenticated [Role: ADMIN]|`projectController.restore`|



##### **Modul: Rekonsiliasi Lapangan (3 Endpoint)** 

File sumber: `backend/src/modules/reconciliation/reconciliation.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`GET`|`/api/reconciliation/filter-options`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`reconciliationController.getFilterOptions`|
|`GET`|`/api/reconciliation/inventory`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`reconciliationController.getInventory`|
|`PUT`|`/api/reconciliation/remains-note`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`reconciliationController.saveRemainsNote`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 87 

##### **Modul: Laporan & Rekonsiliasi (14 Endpoint)** 

File sumber: `backend/src/modules/reports/reports.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`GET`|`/api/reports/stock-history`|JWT Authenticated [Role: ADMIN]|`reportsController.getStockHistory`|
|`GET`|`/api/reports/stock-history/export`|JWT Authenticated [Role: ADMIN]|`reportsController.exportStockHistoryExcel`|
|`GET`|`/api/reports/audit-log`|JWT Authenticated [Role: ADMIN]|`reportsController.getAuditLogs`|
|`GET`|`/api/reports/audit-log/export`|JWT Authenticated [Role: ADMIN]|`reportsController.exportAuditLogExcel`|
|`GET`|`/api/reports/reconciliation-upload-logs`|JWT Authenticated [Role: ADMIN]|`reportsController.getReconciliationUploadLogs`|
|`GET`|`/api/reports/hardware-reconciliation`|JWT Authenticated [Role: ADMIN]|`reportsController.getHardwareReconciliation`|
|`GET`|`/api/reports/hardware-reconciliation/per-tiket`|JWT Authenticated [Role: ADMIN]|`reportsController.getHardwareReconciliationPerTiket`|
|`GET`|`/api/reports/hardware-reconciliation/detailed`|JWT Authenticated [Role: ADMIN]|`reportsController.getHardwareReconciliationDetailed`|
|`GET`|`/api/reports/zone-utilization-history`|JWT Authenticated [Role: ADMIN]|`reportsController.getZoneUtilizationHistory`|
|`GET`|`/api/reports/zone-utilization`|JWT Authenticated [Role: ADMIN]|`reportsController.getZoneUtilization`|
|`GET`|`/api/reports/reconciliation/template`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`reportsController.downloadReconciliationTemplate`|
|`POST`|`/api/reports/reconciliation/backfill`|JWT Authenticated [Role: ADMIN]|`reportsController.backfillReconciliation`|
|`POST`|`/api/reports/reconciliation/upload`|JWT Authenticated [Role: ADMIN,SUPERVISOR] + Multer File Upload|`reportsController.uploadReconciliationFile`|
|`POST`|`/api/reports/reconciliation/confirm`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`reportsController.confirmReconciliationUpload`|



##### **Modul: Pengaturan Sistem (4 Endpoint)** 

File sumber: `backend/src/modules/settings/settings.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`GET`|`/api/settings/notifications`|JWT Authenticated [All Roles]|`settingsController.getNotificationPreferences`|
|`PUT`|`/api/settings/notifications`|JWT Authenticated [All Roles]|`settingsController.updateNotificationPreferences`|
|`GET`|`/api/settings`|JWT Authenticated [All Roles]|`settingsController.getUserSettings`|
|`PUT`|`/api/settings`|JWT Authenticated [All Roles]|`settingsController.updateUserSettings`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 88 

##### **Modul: Supplier (6 Endpoint)** 

File sumber: `backend/src/modules/supplier/supplier.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/suppliers`|JWT Authenticated [Role: ADMIN]|`supplierController.create`|
|`GET`|`/api/suppliers`|JWT Authenticated [All Roles]|`supplierController.findAll`|
|`GET`|`/api/suppliers/:code`|JWT Authenticated [All Roles]|`supplierController.findByCode`|
|`PUT`|`/api/suppliers/:code`|JWT Authenticated [Role: ADMIN]|`supplierController.update`|
|`DELETE`|`/api/suppliers/:code`|JWT Authenticated [Role: ADMIN]|`supplierController.softDelete`|
|`PATCH`|`/api/suppliers/:code/restore`|JWT Authenticated [Role: ADMIN]|`supplierController.restore`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 89 

##### **Modul: Surat Jalan & Distribusi (23 Endpoint)** 

File sumber: `backend/src/modules/surat-jalan/surat-jalan.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/surat-jalan`|JWT Authenticated [Role: ADMIN,STAFF]|`suratJalanController.create`|
|`POST`|`/api/surat-jalan/inbound/staff`|JWT Authenticated [All Roles]|`suratJalanController.createStaffInbound`|
|`POST`|`/api/surat-jalan/:id/receive-inbound`|JWT Authenticated [All Roles]|`suratJalanController.receiveInbound`|
|`GET`|`/api/surat-jalan/outbound/queue`|JWT Authenticated [All Roles]|`suratJalanController.findOutboundQueue`|
|`GET`|`/api/surat-jalan/outbound/approval`|JWT Authenticated [Role: SUPERVISOR]|`suratJalanController.findOutboundForApproval`|
|`GET`|`/api/surat-jalan/outbound/delivery`|JWT Authenticated [Role: SUPERVISOR]|`suratJalanController.findOutboundForDelivery`|
|`GET`|`/api/surat-jalan/outbound/riwayat-approval`|JWT Authenticated [Role: SUPERVISOR]|`suratJalanController.findOutboundApprovalHistory`|
|`GET`|`/api/surat-jalan/outbound/:id`|JWT Authenticated [All Roles]|`suratJalanController.findOutboundDetail`|
|`GET`|`/api/surat-jalan/inbound`|JWT Authenticated [All Roles]|`suratJalanController.findInboundList`|
|`GET`|`/api/surat-jalan/staff/history`|JWT Authenticated [All Roles]|`suratJalanController.findStaffHistory`|
|`GET`|`/api/surat-jalan/rejected`|JWT Authenticated [Role: SUPERVISOR]|`suratJalanController.findRejectedList`|
|`GET`|`/api/surat-jalan/:id`|JWT Authenticated [All Roles]|`suratJalanController.findById`|
|`PUT`|`/api/surat-jalan/:id/approve-outbound`|JWT Authenticated [Role: SUPERVISOR]|`suratJalanController.approveOutbound`|
|`PUT`|`/api/surat-jalan/:id/confirm-distributed`|JWT Authenticated [Role: SUPERVISOR]|`suratJalanController.confirmDistributed`|
|`PUT`|`/api/surat-jalan/:id/delivery-status`|JWT Authenticated [Role: STAFF,SUPERVISOR]|`suratJalanController.updateDeliveryStatus`|
|`POST`|`/api/surat-jalan/:id/transit/tiba`|JWT Authenticated [Role: STAFF]|`suratJalanController.tibaDiTransit`|
|`POST`|`/api/surat-jalan/:id/transit/lanjut`|JWT Authenticated [Role: STAFF]|`suratJalanController.lanjutDariTransit`|
|`PUT`|`/api/surat-jalan/:id/reject-outbound`|JWT Authenticated [Role: SUPERVISOR]|`suratJalanController.rejectOutbound`|
|`PUT`|`/api/surat-jalan/:id/cancel-draft`|JWT Authenticated [Role: STAFF,SUPERVISOR,ADMIN]|`suratJalanController.cancelDraft`|
|`POST`|`/api/surat-jalan/:id/putaway`|JWT Authenticated [Role: STAFF,SUPERVISOR]|`suratJalanController.putaway`|
|`POST`|`/api/surat-jalan/:id/retrieve`|JWT Authenticated [Role: STAFF,SUPERVISOR]|`suratJalanController.retrieve`|
|`POST`|`/api/surat-jalan/:id/items/:itemId/fotos`|JWT Authenticated [Role: STAFF,SUPERVISOR]|`suratJalanController.addItemFoto`|
|`DELETE`|`/api/surat-jalan/:id/items/:itemId/fotos/:fotoId`|JWT Authenticated [Role: STAFF,SUPERVISOR]|`suratJalanController.deleteItemFoto`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 90 

##### **Modul: Titik Lapangan (6 Endpoint)** 

File sumber: `backend/src/modules/titik-lapangan/titik-lapangan.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/titik-lapangan`|JWT Authenticated [Role: ADMIN]|`titikLapanganController.create`|
|`GET`|`/api/titik-lapangan`|JWT Authenticated [All Roles]|`titikLapanganController.findAll`|
|`GET`|`/api/titik-lapangan/:id`|JWT Authenticated [All Roles]|`titikLapanganController.findById`|
|`PUT`|`/api/titik-lapangan/:id`|JWT Authenticated [Role: ADMIN]|`titikLapanganController.update`|
|`DELETE`|`/api/titik-lapangan/:id`|JWT Authenticated [Role: ADMIN]|`titikLapanganController.softDelete`|
|`PATCH`|`/api/titik-lapangan/:id/restore`|JWT Authenticated [Role: ADMIN]|`titikLapanganController.restore`|



##### **Modul: Satuan (6 Endpoint)** 

File sumber: `backend/src/modules/unit/unit.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/units`|JWT Authenticated [Role: ADMIN]|`unitController.create`|
|`GET`|`/api/units`|JWT Authenticated [All Roles]|`unitController.findAll`|
|`GET`|`/api/units/:code`|JWT Authenticated [All Roles]|`unitController.findByCode`|
|`PUT`|`/api/units/:code`|JWT Authenticated [Role: ADMIN]|`unitController.update`|
|`DELETE`|`/api/units/:code`|JWT Authenticated [Role: ADMIN]|`unitController.softDelete`|
|`PATCH`|`/api/units/:code/restore`|JWT Authenticated [Role: ADMIN]|`unitController.restore`|



##### **Modul: File Upload (2 Endpoint)** 

File sumber: `backend/src/modules/upload/upload.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/upload`|JWT Authenticated [All Roles] + Multer File Upload|`uploadFile`|
|`POST`|`/api/upload/boq-reference`|JWT Authenticated [Role: ADMIN,SUPERVISOR] + Multer File Upload|`uploadBoqReference`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 91 

##### **Modul: Manajemen Pengguna (6 Endpoint)** 

File sumber: `backend/src/modules/users/users.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`PATCH`|`/api/users/me/avatar`|JWT Authenticated [All Roles]|`usersController.updateAvatar`|
|`DELETE`|`/api/users/me/avatar`|JWT Authenticated [All Roles]|`usersController.deleteAvatar`|
|`POST`|`/api/users`|JWT Authenticated [Role: ADMIN]|`usersController.create`|
|`GET`|`/api/users`|JWT Authenticated [Role: ADMIN]|`usersController.findAll`|
|`GET`|`/api/users/:user_id`|JWT Authenticated [Role: ADMIN]|`usersController.findById`|
|`PUT`|`/api/users/:user_id`|JWT Authenticated [Role: ADMIN]|`usersController.update`|



##### **Modul: Kendaraan (5 Endpoint)** 

File sumber: `backend/src/modules/vehicle/vehicle.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/vehicles`|JWT Authenticated [Role: ADMIN]|`vehicleController.create`|
|`GET`|`/api/vehicles`|JWT Authenticated [All Roles]|`vehicleController.findAll`|
|`GET`|`/api/vehicles/:no_polisi`|JWT Authenticated [All Roles]|`vehicleController.findByNoPolisi`|
|`PUT`|`/api/vehicles/:no_polisi`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`vehicleController.update`|
|`DELETE`|`/api/vehicles/:kendaraan_id`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`vehicleController.remove`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 92 

##### **Modul: Gudang (11 Endpoint)** 

File sumber: `backend/src/modules/warehouse/warehouse.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/warehouses`|JWT Authenticated [Role: ADMIN]|`warehouseController.create`|
|`GET`|`/api/warehouses`|JWT Authenticated [All Roles]|`warehouseController.findAll`|
|`GET`|`/api/warehouses/:nama_gudang`|JWT Authenticated [All Roles]|`warehouseController.findByNama`|
|`PUT`|`/api/warehouses/:nama_gudang`|JWT Authenticated [Role: ADMIN]|`warehouseController.update`|
|`DELETE`|`/api/warehouses/:nama_gudang`|JWT Authenticated [Role: ADMIN]|`warehouseController.softDelete`|
|`PATCH`|`/api/warehouses/:nama_gudang/restore`|JWT Authenticated [Role: ADMIN]|`warehouseController.restore`|
|`GET`|`/api/warehouses/:gudang_id/layout`|JWT Authenticated [All Roles]|`warehouseController.getLayout`|
|`GET`|`/api/warehouses/:gudang_id/zona/:zona_id/stock-snapshot`|JWT Authenticated [All Roles]|`warehouseController.getZoneStockSnapshot`|
|`GET`|`/api/warehouses/:gudang_id/stock-check`|JWT Authenticated [All Roles]|`warehouseController.getStockCheck`|
|`GET`|`/api/warehouses/:gudang_id/picking-stock-check`|JWT Authenticated [All Roles]|`warehouseController.getPickingStockCheck`|
|`GET`|`/api/warehouses/:gudang_id/picking-availability`|JWT Authenticated [All Roles]|`warehouseController.getPickingAvailability`|



##### **Modul: Zona Gudang (6 Endpoint)** 

File sumber: `backend/src/modules/zone/zone.routes.js` 

|**Method**|**Path**|**Autentikasi & Hak Akses**|**Handler / Controller**|
|---|---|---|---|
|`POST`|`/api/zones`|JWT Authenticated [Role: ADMIN]|`zoneController.create`|
|`GET`|`/api/zones`|JWT Authenticated [All Roles]|`zoneController.findAll`|
|`GET`|`/api/zones/:code`|JWT Authenticated [All Roles]|`zoneController.findByCode`|
|`PUT`|`/api/zones/:zona_id`|JWT Authenticated [Role: ADMIN]|`zoneController.updateById`|
|`DELETE`|`/api/zones/:zona_id`|JWT Authenticated [Role: ADMIN]|`zoneController.deleteById`|
|`PATCH`|`/api/zones/:zona_id/utilization-status`|JWT Authenticated [Role: ADMIN,SUPERVISOR]|`zoneController.updateUtilizationStatus`|



Digitak Warehouse Management System  ·  PRD v1.0 

Halaman 93 

