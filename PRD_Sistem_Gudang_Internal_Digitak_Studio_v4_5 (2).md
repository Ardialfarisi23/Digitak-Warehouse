# **PRODUCT REQUIREMENT DOCUMENT** 

### **Sistem Manajemen Gudang Internal Perangkat IT & Infrastruktur** 

_PT Metanouva Informatika (Digitak Studio)_ 

**Versi Dokumen Sebelumnya:** 4.4 (Revisi Manajemen Pengguna, Penyederhanaan Layout Gudang, Alur Reject Approval, Penegasan Audit Log, & Struktur Halaman Riwayat/Rekonsiliasi) | 13 Agustus 2026 

**Versi Dokumen:** 4.5 (Standardisasi Istilah Tiket Gudang/BOQ, Kejelasan Sumber Data Project, Restrukturisasi Halaman Laporan-Audit & Rekonsiliasi Inventory Mitra, Klarifikasi Semantik Hapus, & Fitur Detail Zona) 

**Tanggal:** 15 Agustus 2026 

**Status:** Draft untuk Review 

PT Metanouva Informatika, beroperasi dengan nama Digitak Studio, adalah perusahaan penyedia solusi Teknologi Informasi yang berdiri sejak tahun 1999 dan berbasis di Cimahi, Jawa Barat. Lini layanannya mencakup IT consulting, pengembangan aplikasi/software, solusi Enterprise Resource Planning (ERP), system integration, serta pengelolaan infrastruktur IT (hosting, manajemen server, manajemen jaringan, dan penyediaan perangkat infrastruktur). 

Dokumen ini melanjutkan revisi v4.4, menambahkan klarifikasi dan perbaikan hasil tinjauan lanjutan terhadap: standardisasi istilah & struktur relasi Tiket Gudang-BOQ, kejelasan sumber dan waktu pembuatan data Project, penegasan bahwa alur “tim eksternal gudang” v4.2 sudah sepenuhnya digantikan, restrukturisasi halaman Laporan & Audit Menyeluruh, pembuatan halaman baru Rekonsiliasi Inventory untuk mitra pelaksana, klarifikasi semantik “hapus” sebagai soft delete, dan penambahan fitur Detail Zona (drill-down). 

### **0.1 Ringkasan Perubahan v4.5 (Revisi Ini)** 

Revisi v4.5 lahir dari tinjauan lanjutan atas draft v4.4, mencakup 12 temuan substantif berikut. Catatan: 11 temuan v4.4 terkait Manajemen Pengguna (Gudang yang Ditugaskan, Hubungkan ke Personil, alur aktivasi akun — lihat 8.4), penyederhanaan Layout Gudang (Gudang→Zona, Kecukupan Area manual, pencoretan Grid Editor, istilah “utilisasi Zona”), dan alur reject approval (7.4.1 & 7.9.1) sudah final di v4.4 dan dikonfirmasi tanpa perubahan lebih lanjut pada tinjauan ini. 

|**No**|**Area**|**v4.4**|**v4.5 (Revisi Ini)**|
|---|---|---|---|
|1|Istlah Tiket|4 istlah berbeda dipakai bergantan:<br>“Surat Tiket”, “Tiket Material”, “Kode<br>Tiket”, “Tiket Gudang”|Distandardisasi: enttas header disebut<br>“Tiket Gudang”; “Kode Tiket” khusus untuk<br>feld identfer unik di dalamnya. “Surat<br>Tiket” & “Tiket Material” tdak dipakai lagi<br>— lihat 6.1|
|2|Struktur relasi Tiket<br>Gudang vs BOQ|Disebut berdampingan, berpotensi<br>dibaca sebagai dua enttas setara|Diperjelas: Tiket Gudang = header/wadah;<br>BOQ = detail/isi (baris item hardware) di<br>dalam satu Tiket Gudang — lihat 6.1|
|3|Alur “tm eksternal<br>gudang” v4.2|Tidak ditegaskan ulang status<br>penggantannya|Ditegaskan eksplisit di 7.2: alur v4.2 sudah<br>sepenuhnya digantkan oleh alur v4.3 (PO|



|**No**|**Area**|**v4.4**|**v4.5 (Revisi Ini)**|
|---|---|---|---|
||||internal → email PDF), tdak lagi berlaku<br>dalam bentuk apa pun|
|4|Sumber & tming<br>data Project|Belum jelas apakah Project dibuat<br>dari email/PO yang sama dengan<br>BOQ, atau harus terdafar lebih dulu<br>oleh PM/Sales|Diklarifkasi sebagai dua jalur resmi (Project<br>sudah ada dipilih dari Master Data, atau<br>dibuat baru inline saat input Tiket Gudang)<br>— lihat 7.1.2|
|5|Dropdown Project<br>pada form Tiket<br>Gudang|Hanya memilih Project yang sudah<br>terdafar di Master Data|Ditambahkan opsi “+ Buat project baru”<br>inline pada dropdown — lihat 7.10.1|
|6|Struktur halaman<br>Laporan & Audit<br>Menyeluruh|7.12: dua sub-halaman (Riwayat Stok,<br>Rekonsiliasi) di bawah satu judul|Diformalkan sebagai 1 halaman “Laporan &<br>Audit Menyeluruh” dengan 2 tab: Audit Log,<br>Riwayat Stok. Rekonsiliasi dipindah ke<br>halaman tersendiri (lihat No.8) — lihat 7.12|
|7|Formula Remains|Remains = Hardware on Site − Used|Diperbarui menjadi Remains = MOS − (BoQ<br>Plan + Additonal) — lihat 7.13.2|
|8|Halaman<br>Rekonsiliasi|Sub-halaman di bawah Laporan &<br>Audit Menyeluruh (7.12.2)|Dipisah menjadi halaman berdiri sendiri<br>“Rekonsiliasi Inventory”: tabel utama per<br>Project/Kode Perangkat (MOS Sistem vs<br>MOS Laporan Mitra + Selisih) & tab<br>“Riwayat Input Laporan Mitra” untuk<br>upload/parsing Compile Excel — lihat 7.13|
|9|Defnisi “Used”|Disebut sebagai komponen<br>rekonsiliasi tanpa defnisi sumber<br>data|Diklarifkasi: dua kandidat sumber — proxy<br>otomats dari status Surat Jalan<br>(Terkirim/Terpasang), atau feld manual dari<br>laporan mitra — lihat 7.13.3|
|10|Semantk “hapus” di<br>8.3|Tidak dijelaskan apakah hard delete<br>atau sof delete|Diperjelas berart nonaktfan (sof<br>delete/status Nonaktf), bukan hard delete,<br>demi integritas data historis transaksi &<br>audit log. Berlaku untuk Master Data<br>maupun User Management — lihat 8.3|
|11|Alur BOQ vendor<br>eksternal|Open Decision (Opsi A feld teks<br>bebas vs Opsi B Master Data Vendor),<br>belum diputuskan|Tetap Open Decision, dikonfrmasi ulang<br>statusnya pada tnjauan ini — belum ada<br>perubahan keputusan; lihat 0.1b & 6.1|
|12|Detail Zona (drill-<br>down)|Belum ada di roadmap|Fitur baru: klik Zona pada denah Layout<br>Gudang membuka panel snapshot stok per<br>Kode Perangkat di Zona tsb., dengan tautan<br>ke Riwayat Stok terflter otomats — lihat<br>7.6.1|



### **0.1b Keputusan Diperlukan (Open Decisions) — Ringkasan** 

Butir berikut belum final dan memerlukan keputusan bersama stakeholder sebelum masuk pengembangan. Status tidak berubah dari v4.4 — dikonfirmasi ulang pada tinjauan v4.5: 

- Sumber pengiriman BOQ dari vendor eksternal (di luar tim internal Digitak Studio): dicatat sebagai field teks bebas “Sumber Pengiriman” (cepat, tapi tidak konsisten & sulit dilaporkan) atau sebagai Master Data Vendor baru (konsisten, dapat dilaporkan, namun menambah scope MVP). Rekomendasi tim produk: Master Data Vendor, karena sejalan dengan prinsip “Master Data → BOQ” yang sudah dianut di 6.1, namun keputusan akhir tetap menunggu konfirmasi Admin General & tim internal Digitak Studio. Lihat 6.1 & 7.1.1. 

### **0.2 Ringkasan Perubahan v4.4 & Sebelumnya (Sejarah)** 

Ringkasan perubahan v4.4, v4.3, v4.2, v4.0, dan v3.0 tetap berlaku sebagai riwayat dan tidak diulang di sini secara rinci; lihat dokumen v4.4 untuk detail lengkap. Seluruh poin dari v4.4 (Manajemen Pengguna, penyederhanaan Layout Gudang, alur reject approval, penegasan audit log append-only, dan struktur awal halaman Riwayat Stok & Rekonsiliasi) tetap berlaku dan menjadi dasar bagi klarifikasi tambahan pada revisi ini. 

## **1. Ringkasan Eksekutif** 

Dokumen ini menjabarkan kebutuhan produk untuk sistem digital manajemen gudang internal perangkat IT & infrastruktur milik PT Metanouva Informatika (Digitak Studio). Sistem mengelola dua gudang tetap di lokasi berbeda (Kantor Pusat Cimahi dan gudang kedua/Rancamanyar), ditambah kemampuan mencatat lokasi penyimpanan sementara (“Gudang Dadakan”) saat instalasi di site klien membutuhkannya. 

Alur perangkat mengikuti struktur perencanaan: Master Data menjadi rujukan induk; setiap Tiket Gudang adalah entitas header/wadah proyek yang berisi tepat satu BOQ sebagai detail rencana hardware (Baru v4.5 — lihat 6.1); dan Surat Jalan menjadi realisasi pengiriman. Sumber utama BOQ saat ini adalah PO internal Digitak Studio yang dikirim via email PDF (v4.3); alur BOQ dari vendor eksternal (mis. pengiriman langsung dari pabrikan/distributor) masih menjadi Open Decision (lihat 0.1b, 6.1). 

(Baru v4.5) Pada revisi ini, istilah untuk entitas tiket distandardisasi menjadi “Tiket Gudang” (header) dengan “Kode Tiket” sebagai field identifier uniknya, menggantikan pemakaian bergantian “Surat Tiket”/“Tiket Material” pada draf sebelumnya. Sumber dan waktu pembuatan data Project diklarifikasi sebagai dua jalur resmi, dengan opsi “+ Buat project baru” ditambahkan langsung pada dropdown Project di form Tiket Gudang. Halaman Laporan & Audit Menyeluruh direstrukturisasi menjadi 2 tab (Audit Log, Riwayat Stok), sementara Rekonsiliasi dipisah menjadi halaman baru 

“Rekonsiliasi Inventory” yang mengakomodasi laporan mitra pelaksana (upload Compile Excel) dengan formula Remains yang diperbarui. Semantik “hapus” pada 8.3 diperjelas sebagai soft delete. Fitur baru Detail Zona (drill-down) ditambahkan pada Layout Gudang. 

Pernyataan Tujuan Produk (tidak berubah): “Menjadi sistem manajemen gudang yang cukup dalam untuk menggantikan pencatatan manual sepenuhnya, namun cukup sederhana untuk dipakai tanpa tim IT eksternal dan tanpa pelatihan panjang.” 

## **5. Peran & Aktor Pengguna** 

Tetap tiga peran, seluruhnya internal PT Metanouva Informatika (Digitak Studio) — tidak ada akses untuk pihak eksternal/klien. Definisi tanggung jawab per peran tidak berubah dari v4.4 (lihat versi sebelumnya untuk tabel lengkap), dengan tambahan: Supervisor & Admin General kini juga memiliki akses ke halaman “Rekonsiliasi Inventory” yang berdiri sendiri (Baru v4.5 — lihat 7.13), menggantikan referensi sebelumnya ke sub-halaman Rekonsiliasi di 7.12. 

## **6. Model Data & Relasi Dokumen (Topologi)** 

### **6.1 Aturan Relasi Utama (Direvisi v4.5 — Standardisasi Istilah)** 

**(Baru v4.5) Standardisasi istilah.** Draf sebelumnya memakai empat istilah berbeda (“Surat Tiket”, “Tiket Material”, “Kode Tiket”, “Tiket Gudang”) untuk kemungkinan konsep yang sama, berisiko membingungkan tim pengembang & pengguna. Mulai revisi ini: 

- **“Tiket Gudang”** adalah nama entitas/dokumen header — satu-satunya istilah yang dipakai untuk merujuk ke entitas ini. “Surat Tiket” dan “Tiket Material” tidak dipakai lagi di seluruh dokumen maupun antarmuka. 

- **“Kode Tiket”** adalah field identifier unik (nomor/kode) yang melekat pada setiap Tiket Gudang — dipakai khusus saat merujuk ke nilai kode itu sendiri (mis. pada kolom tabel, filter, atau referensi dokumen), bukan sebagai nama entitas. 

**(Baru v4.5) Struktur relasi header–detail.** Tiket Gudang dan BOQ bukan dua entitas setara: Tiket Gudang adalah **wadah (header)** tingkat proyek, sedangkan BOQ adalah **isinya (detail)** — kumpulan baris rencana hardware di dalam Tiket Gudang tersebut. Relasi 1:1 pada aturan sebelumnya (“1 Surat Tiket = 1 BOQ”) tetap berlaku secara kardinalitas, namun kini dinyatakan secara eksplisit sebagai relasi header–detail, bukan dua dokumen yang berdiri sejajar: 

- Setiap Tiket Gudang (header) memiliki tepat satu BOQ (detail/isi) di dalamnya — BOQ tidak dapat berdiri sendiri tanpa Tiket Gudang induknya 

- 1 BOQ/Tiket Gudang dapat direalisasikan melalui banyak Surat Jalan 

- Master Data adalah data induk (parent) — seluruh baris BOQ dan Surat Jalan wajib merujuk ke master data ini, bukan input bebas teks 

- Setiap Surat Jalan menuju satu gudang/lokasi tujuan: Gudang 1, Gudang 2, atau Gudang Dadakan 

- Setiap baris perangkat dalam Surat Jalan membawa data kondisi 

- Rantai upstream BOQ jalur internal (v4.3): Diskusi kebutuhan & PO oleh tim internal Digitak Studio → BOQ final via email PDF → diinput sebagai BOQ Plan berstatus Draft di dalam Tiket Gudang → diverifikasi & diaktifkan Admin General 

- Setiap Tiket Gudang terhubung ke satu Project/Cluster (RW) — lihat 7.1.2 & 7.10.1 untuk klarifikasi sumber & waktu pembuatan data Project (Baru v4.5) 

**(Tidak berubah dari v4.4) Rantai upstream BOQ jalur vendor eksternal — Keputusan Diperlukan:** selain jalur internal Digitak Studio, di lapangan juga ditemukan pengiriman perangkat yang berasal dari vendor eksternal (mis. PT Produsen Barang Pokok) langsung ke gudang/site klien. PRD saat ini 

belum punya cara terstruktur mencatat “asal pengiriman” untuk kasus ini. Dua opsi yang dipertimbangkan tetap berlaku tanpa perubahan pada tinjauan v4.5 ini: 

- Opsi A — Field teks bebas “Sumber Pengiriman” pada Surat Jalan inbound: implementasi cepat, cocok untuk MVP, namun rawan variasi penulisan (“PT Produsen Barang Pokok” vs “Produsen Barang Pokok” vs “PBP”) sehingga sulit direkap/dilaporkan. 

- Opsi B — Master Data Vendor baru (nama vendor, jenis vendor, kontak): konsisten dengan prinsip Master Data sebagai parent (lihat aturan relasi di atas), dapat difilter & dilaporkan, namun menambah cakupan data master & effort MVP. 

_Catatan: keputusan akhir (Opsi A/B) perlu dikonfirmasi Admin General & tim internal Digitak Studio sebelum masuk tahap desain teknis; sampai ada keputusan, field “Sumber Pengiriman” sementara didokumentasikan sebagai kebutuhan tanpa struktur data final — lihat juga 7.1.1._ 

## **7. Ruang Lingkup Fungsional** 

### **7.1 Master Data** 

(tidak berubah dari v4.4 — kode perangkat, satuan, personil, kendaraan, Project/Cluster, gudang; lihat versi sebelumnya untuk daftar lengkap) 

### **7.1.1 Master Data Vendor (Kandidat, menunggu keputusan 6.1)** 

Status tidak berubah dari v4.4 — bagian ini bersifat kandidat desain, bukan keputusan final, menunggu penyelesaian Open Decision pada 0.1b. Jika Opsi B pada 6.1 dipilih, entitas berikut ditambahkan ke Master Data: 

- Nama Vendor 

- Jenis Vendor (mis. Distributor, Pabrikan, Vendor Proyek Lain) 

- Kontak (PIC, nomor telepon/email) 

- Status Aktif 

### **7.1.2 Sumber & Timing Pembuatan Data Project (Baru v4.5)** 

Sebelumnya belum jelas apakah data Project/Cluster (RW) dibuat dari email/PO yang sama dengan BOQ, atau harus sudah terdaftar lebih dulu oleh PM/Sales sebelum Tiket Gudang dapat dibuat. Revisi ini mengklarifikasi dua jalur resmi yang berlaku berdampingan: 

- **Jalur A — Project sudah terdaftar:** PM/Sales mendaftarkan Project/Cluster ke Master Data lebih dahulu (mis. saat kontrak/PO disepakati), sebelum Tiket Gudang & BOQ terkait dibuat. Ini jalur yang direkomendasikan untuk Project dengan kepastian scope & jadwal. 

- **Jalur B — Project dibuat inline saat input Tiket Gudang:** bila Project belum terdaftar saat email/PO BOQ diterima, Admin General/Supervisor dapat membuat data Project baru langsung dari form Tiket Gudang (lihat opsi “+ Buat project baru” pada 7.10.1), sehingga tidak memblokir input BOQ karena menunggu pendaftaran Project terpisah. 

_Kedua jalur menghasilkan baris Master Data Project yang identik strukturnya — tidak ada perbedaan skema antara Project yang didaftarkan lebih dulu oleh PM/Sales dengan yang dibuat_ 

_inline saat input Tiket Gudang. Field minimum: Nama Project/Cluster (RW), status Aktif, dan referensi pembuat (created_by, mengikuti 7.10.2)._ 

### **7.2 Alur BOQ & Sumber Pengiriman (Penegasan v4.5)** 

**(Baru v4.5) Penegasan status alur v4.2.** Sebagian pihak masih merujuk ke alur “tim eksternal gudang” sebagaimana didefinisikan pada v4.2, di mana koordinasi BOQ/pengiriman melibatkan pihak eksternal secara langsung tanpa PO internal terformalisasi. Revisi ini menegaskan secara eksplisit: 

- Alur “tim eksternal gudang” v4.2 sudah SEPENUHNYA DIGANTIKAN oleh alur v4.3 (PO internal Digitak Studio → BOQ final via email PDF → diinput sebagai BOQ Plan) — tidak ada lagi jalur operasional, dokumentasi, maupun pelatihan pengguna yang merujuk ke alur v4.2 dalam bentuk apa pun 

- Rujukan ke “tim eksternal gudang” pada materi pelatihan atau SOP lama harus dianggap usang (deprecated) dan diperbarui mengikuti alur v4.3 saat sistem diimplementasikan 

- Penegasan ini tidak mengubah status Open Decision terkait vendor eksternal pada 6.1/0.1b — keduanya adalah topik berbeda: v4.2 vs v4.3 adalah soal alur koordinasi internal Digitak Studio yang sudah final, sedangkan Opsi A/B pada 6.1 adalah soal pencatatan pengiriman dari vendor eksternal yang masih terbuka 

### **7.4 Penerimaan Perangkat, Pencatatan Kondisi & Kelebihan Barang** 

(Bagian inti tidak berubah dari v4.4: pencocokan Surat Jalan dengan fisik, pencatatan kondisi per unit, foto otomatis, dan proses inbound tambahan untuk kelebihan barang.) 

### **7.4.1 Alur Penolakan (Reject) Inbound** 

Status tidak berubah dari v4.4 — status Ditolak sudah selesai didefinisikan sebagai jalur resmi: Supervisor menolak dengan alasan wajib, notifikasi ke Staf Gudang, dan pengajuan ulang sebagai transaksi inbound baru yang merujuk ke transaksi ditolak sebelumnya untuk jejak audit. Lihat 14.6 untuk diagram alur lengkap. 

### **7.6 Manajemen Multi-Gudang & Struktur Lokasi** 

Struktur lokasi Gudang → Zona (Indoor/Outdoor) tidak berubah dari v4.4. Sistem mendukung 2 gudang tetap (Kantor Pusat Cimahi & Rancamanyar), ditambah Gudang Dadakan yang bersifat dinamis. Layout kedua gudang tetap identik secara struktural — data Zona (A/B/C/D, masing-masing bertipe Indoor atau Outdoor) di-seed satu kali ke basis data dan berlaku sama untuk Cimahi maupun Rancamanyar; tidak ada Configuration Wizard atau UI edit layout — layout bersifat fixed di backend dan tidak dapat diubah dari antarmuka pengguna (dikonfirmasi tidak berubah dari v4.4, lihat 7.8). 

### **7.6.1 Detail Zona — Drill-down (Baru v4.5)** 

Fitur baru pada halaman Layout Gudang: pengguna (Admin General & Supervisor sesuai gudang yang ditugaskan) dapat mengklik sebuah Zona pada denah untuk membuka panel Detail Zona, berisi: 

- Snapshot stok saat ini per Kode Perangkat yang berada di Zona tersebut (qty per kode perangkat, diambil dari posisi terkini hasil putaway/pemindahan terakhir) 

- Ringkasan jumlah total unit & jumlah jenis kode perangkat di Zona tersebut 

- Tautan “Lihat Riwayat Stok” yang membuka halaman Riwayat Stok (7.12) dengan filter Gudang & Zona otomatis terisi sesuai Zona yang diklik, sehingga pengguna dapat langsung menelusuri histori transaksi tanpa mengatur ulang filter secara manual 

_Fitur ini bersifat read-only (tidak ada aksi edit/hapus dari panel Detail Zona) dan tidak mengubah struktur data Zona itu sendiri — murni lapisan tampilan/query di atas data putaway & Riwayat Stok yang sudah ada._ 

### **7.7 Kecukupan Area (Manual)** 

Tidak berubah dari v4.4 — status kecukupan (Cukup/Mendekati Penuh/Tidak Cukup) diinput langsung oleh Supervisor saat opname, disertai label “Dinilai manual oleh [nama Supervisor] pada [tanggal]”. Field kapasitas otomatis tetap dihapus dari data model. 

### **7.8 Modul Lanjutan** 

Tidak berubah dari v4.4 — Grid Editor drag-and-drop tetap dicoret total dari roadmap (lihat 10.4 & 11.2). Auto-generate dokumen (GRN, Packing List, Surat Jalan PDF) tetap tersedia. RBAC 3 peran dan audit log per transaksi/pengguna tetap berlaku (lihat 8.3, direvisi v4.5 untuk semantik “hapus”). 

### **7.9 Approval Outbound Bertingkat** 

(Matriks approval berbasis kategori kritis tidak berubah — lihat versi sebelumnya untuk tabel lengkap.) 

### **7.9.1 Alur Penolakan (Reject) Outbound** 

Status tidak berubah dari v4.4 — status Ditolak sudah selesai didefinisikan, menyisip di antara status Diajukan dan Disetujui, dengan alasan wajib, notifikasi ke Staf Gudang, dan pengajuan ulang sebagai Surat Jalan baru. Lihat 14.7. 

### **7.10.1 Form Tiket Gudang — Dropdown Project (Baru v4.5)** 

Form pembuatan/edit Tiket Gudang memiliki field Project/Cluster berupa dropdown yang menampilkan daftar Project aktif dari Master Data. Revisi ini menambahkan opsi berikut pada dropdown tersebut: 

- **“+ Buat project baru”** — muncul sebagai baris terakhir pada daftar dropdown. Memilih opsi ini membuka form ringkas inline (Nama Project/Cluster) tanpa meninggalkan form Tiket Gudang; setelah disimpan, Project baru otomatis terpilih sebagai nilai field Project pada Tiket Gudang yang sedang dibuat. 

- Project yang dibuat lewat jalur ini langsung tersimpan ke Master Data Project (mengikuti Jalur B pada 7.1.2) dan tersedia untuk dipilih pada Tiket Gudang lain di kemudian hari 

- Validasi nama duplikat diterapkan agar tidak tercipta baris Project ganda dengan nama identik/nyaris identik 

### **7.12 Halaman Laporan & Audit Menyeluruh (Direvisi v4.5 — 2 Tab)** 

Sebelumnya (v4.4) halaman ini dijabarkan sebagai dua sub-halaman: Riwayat Stok dan Rekonsiliasi. Revisi ini merestrukturisasi halaman menjadi “Laporan & Audit Menyeluruh” dengan 2 tab — bukan 3 tab seperti sempat dipertimbangkan pada draf awal — karena Rekonsiliasi kini dipindah menjadi halaman tersendiri (lihat 7.13): 

#### **7.12.1 Tab Audit Log** 

- Filter: rentang tanggal, peran/pengguna, jenis entitas (Master Data, BOQ/Tiket Gudang, approval inbound/outbound, User Management), jenis aksi 

- Kolom: Tanggal & waktu, Pengguna, Peran, Entitas terdampak, Jenis aksi, Detail perubahan (append-only, mengikuti prinsip 8.3), referensi entri sebelumnya bila merupakan koreksi 

- Akses: Admin General (seluruh entri, termasuk entri yang dibuat Admin General sendiri — lihat 8.3) 

#### **7.12.2 Tab Riwayat Stok** 

- Filter: Gudang, Zona, Project/Cluster, rentang tanggal, kategori perangkat, jenis transaksi (Inbound/Outbound/Pemindahan) 

- Kolom: Tanggal & waktu, Kode Perangkat, Nama Barang, Qty, Jenis Transaksi, Gudang/Zona asal-tujuan, Status (termasuk Ditolak — lihat 7.4.1/7.9.1), Personil terkait, referensi dokumen (No. Surat Jalan/Kode Tiket) 

- Akses: Admin General (semua gudang), Supervisor (read-only, terbatas pada gudang yang ditugaskan — lihat 8.4), Staf Gudang tidak memiliki akses ke tab ini secara agregat (hanya melihat transaksi miliknya sendiri lewat riwayat input) 

- Dapat diklik dari panel Detail Zona (7.6.1) dengan filter Gudang & Zona otomatis terisi 

_Kedua tab dapat diekspor sebagai laporan dasar (laporan lanjutan tetap didorong ke fase berikutnya, lihat 10.3)._ 

### **7.13 Halaman Rekonsiliasi Inventory (Baru v4.5 — Halaman Berdiri Sendiri)** 

Sebelumnya Rekonsiliasi adalah sub-halaman/tab di bawah Laporan & Audit Menyeluruh (7.12.2 pada v4.4). Revisi ini memisahkannya menjadi halaman navigasi tersendiri, “Rekonsiliasi Inventory”, agar mengakomodasi kebutuhan verifikasi silang dengan laporan mitra pelaksana eksternal. 

#### **7.13.1 Tabel Utama** 

- Baris data per kombinasi Project & Kode Perangkat (bukan lagi per BOQ/Tiket Gudang saja) 

- Kolom: Project, Kode Perangkat, Nama Barang, MOS (Sistem) — hasil kalkulasi dari data sistem, MOS (Laporan Mitra) — diisi dari hasil parsing Compile Excel mitra, dan Selisih (= MOS Sistem − MOS Laporan Mitra) 

- Baris dengan Selisih ≠ 0 ditandai sebagai indikator perlu perhatian, konsisten dengan pola indikator Remains negatif pada v4.4 

- Dapat difilter per Project/Cluster dan per Gudang/Zona 

#### **7.13.2 Formula Remains (Diperbarui v4.5)** 

**(Direvisi v4.5)** Formula Remains yang sebelumnya _Remains = Hardware on Site − Used_ diperbarui menjadi: 

### **Remains = MOS − (BoQ Plan + Additional)** 

_Perubahan ini menyelaraskan formula Remains dengan MOS (Material on Site) sebagai titik acuan tunggal, alih-alih Hardware on Site yang sebelumnya terpisah secara konseptual dari komponen BoQ Plan/Additional. Kelima komponen dasar (BOQ/BoQ Plan, Additional, MOS, Used, Remains) tetap dipertahankan sebagai satu keluarga metrik rekonsiliasi._ 

#### **7.13.3 Tab Riwayat Input Laporan Mitra** 

- Fungsi upload file Compile Excel dari mitra pelaksana (format & template ditentukan pada tahap desain teknis) 

- Sistem melakukan parsing otomatis untuk mengisi kolom MOS (Laporan Mitra) pada tabel utama (7.13.1) per Project & Kode Perangkat 

- Riwayat setiap upload dicatat: tanggal upload, pengunggah, nama file, ringkasan jumlah baris berhasil/gagal diparsing 

- Upload baru menambah entri riwayat baru (append-only, mengikuti 8.3) — tidak menimpa/menghapus hasil upload sebelumnya; nilai MOS (Laporan Mitra) yang dipakai di tabel utama mengacu ke upload terbaru per Project 

#### **7.13.4 Klarifikasi Definisi “Used” (Baru v4.5)** 

Istilah “Used” pada komponen rekonsiliasi sebelumnya disebut tanpa definisi sumber data yang jelas. Revisi ini mengklarifikasi dua kandidat sumber yang dipertimbangkan: 

- **Kandidat 1 — Proxy otomatis dari status Surat Jalan:** “Used” dihitung sistem dari akumulasi Surat Jalan berstatus Terkirim/Terpasang menuju site klien — tidak memerlukan input manual, namun bergantung pada kedisiplinan pencatatan status Surat Jalan di lapangan. 

- **Kandidat 2 — Field manual dari laporan mitra:** “Used” diisi berdasarkan angka pada Compile Excel yang diunggah mitra pelaksana (7.13.3) — lebih merefleksikan kondisi riil di lapangan menurut mitra, namun bergantung pada frekuensi & akurasi laporan mitra. 

_Catatan: pemilihan kandidat sumber “Used” belum final dan akan ditentukan bersama Selisih MOS (Sistem) vs MOS (Laporan Mitra) pada 7.13.1 sebagai referensi silang — keputusan akhir menunggu tahap desain teknis fitur Rekonsiliasi Inventory._ 

#### **7.13.5 Akses** 

- Admin General: akses penuh ke tabel utama & tab Riwayat Input Laporan Mitra (termasuk upload) untuk seluruh Project 

- Supervisor: akses read-only ke tabel utama, terbatas pada gudang yang ditugaskan; dapat mengunggah laporan mitra untuk Project pada gudangnya 

- Dapat diekspor sebagai laporan dasar, sama seperti 7.12 

## **8. Arsitektur & Kebutuhan Non-Fungsional** 

### **8.3 Keamanan & Akses (Direvisi v4.5 — Klarifikasi Semantik “Hapus”)** 

- RBAC ketat sesuai 3 peran (lihat Bagian 5) 

- Admin General dan Supervisor sama-sama dapat menginput data pada Master Data Personil, Kendaraan, dan Project — namun hanya Admin General yang dapat menonaktifkan data master, menambah kode perangkat baru, atau mengelola akun pengguna (istilah diperbarui dari “menghapus” — lihat klarifikasi di bawah) 

- Approval outbound (7.9, termasuk jalur reject 7.9.1) dan approval status BOQ Draft→Aktif dicatat sebagai transaksi ber-audit-trail, sama seperti approval inbound (termasuk jalur reject 7.4.1) 

(Tidak berubah dari v4.4) Audit log bersifat append-only dan berlaku untuk SELURUH peran tanpa kecuali, termasuk Admin General. Tidak ada peran, termasuk Admin General, yang dapat mengubah atau menghapus entri audit log yang sudah tercatat. Bila terjadi kesalahan input yang perlu dikoreksi (termasuk oleh Admin General), koreksi dilakukan melalui entri transaksi baru yang merujuk ke entri sebelumnya (append-only), bukan dengan mengedit/menghapus entri lama. Ini berlaku untuk seluruh transaksi ber-audit-trail: master data, BOQ/Tiket Gudang, approval inbound/outbound (termasuk reject), dan konfirmasi status Surat Jalan. 

**(Baru v4.5) Klarifikasi semantik “hapus”.** Istilah “hapus” pada redaksi 8.3 sebelumnya berpotensi dibaca sebagai hard delete (penghapusan permanen dari basis data). Revisi ini menegaskan bahwa “hapus” pada seluruh konteks di dokumen ini berarti **nonaktifkan (soft delete)** , bukan hard delete: 

- Baris Master Data (kode perangkat, personil, kendaraan, Project, gudang, dan — bila Opsi B pada 6.1 dipilih — vendor) yang “dihapus” oleh Admin General berpindah ke status Nonaktif, tetap tersimpan di basis data, dan tetap tampil sebagai referensi historis pada transaksi/BOQ/Tiket Gudang yang sudah memakainya sebelumnya 

- Baris berstatus Nonaktif tidak muncul sebagai opsi baru pada dropdown/input transaksi baru, namun tetap dapat dilihat lewat filter “tampilkan nonaktif” pada halaman Master Data terkait 

- Berlaku sama untuk User Management (8.4): “menghapus” akun user berarti mengubah status akun menjadi Nonaktif (lihat state machine 8.4.2), bukan menghapus baris user dari basis data — riwayat transaksi yang pernah dibuat user tetap tersimpan untuk keperluan audit 

- Prinsip ini demi menjaga integritas data historis pada seluruh transaksi & audit log yang merujuk ke baris Master Data atau akun user terkait, konsisten dengan prinsip append-only pada audit log di atas 

### **8.4 Manajemen Pengguna & Aktivasi Akun** 

Tidak berubah dari v4.4 — form tambah/edit user dengan field Gudang yang Ditugaskan (wajib untuk Supervisor & Staf Gudang) dan Hubungkan ke Data Personil, beserta alur aktivasi akun (undangan email → set password → status Menunggu Aktivasi/Aktif/Nonaktif) tetap berlaku tanpa 

perubahan. Lihat 8.4.1, 8.4.2, dan 14.8 untuk detail lengkap. Status “Nonaktif” pada state machine akun konsisten dengan klarifikasi semantik soft delete pada 8.3 di atas (Baru v4.5). 

## **10. Prioritas Inovasi (Bagian Terdampak Revisi v4.5)** 

### **10.1 Fondasi — Wajib Sejak Awal (Tambahan v4.5)** 

- Standardisasi istilah Tiket Gudang/Kode Tiket & struktur relasi header-detail terhadap BOQ (6.1) 

- Form Tiket Gudang dengan dropdown Project + opsi “+ Buat project baru” inline (7.10.1) 

- Klarifikasi semantik “hapus” sebagai soft delete untuk Master Data & User Management (8.3) 

### **10.3 Prioritas Menengah (Tambahan v4.5)** 

- Halaman Laporan & Audit Menyeluruh dengan 2 tab: Audit Log, Riwayat Stok (7.12) 

- Halaman Rekonsiliasi Inventory berdiri sendiri, termasuk tab Riwayat Input Laporan Mitra dengan parsing Compile Excel (7.13) 

- Detail Zona (drill-down) pada Layout Gudang (7.6.1) 

### **10.4 Prioritas Lanjut** 

Tidak berubah dari v4.4 — Master Data Vendor eksternal untuk BOQ (bila Opsi B pada 6.1/0.1b dipilih) masih menunggu keputusan; field nilai/ambang rupiah pada approval outbound tidak berubah. 

## **11. Ruang Lingkup MVP (Bagian Terdampak Revisi v4.5)** 

### **11.1 Termasuk dalam MVP (Tambahan v4.5)** 

- Standardisasi istilah Tiket Gudang & Kode Tiket di seluruh modul (6.1) 

- Sumber & timing pembuatan data Project — dua jalur resmi, termasuk “+ Buat project baru” inline (7.1.2, 7.10.1) 

- Halaman Laporan & Audit Menyeluruh (2 tab) dan halaman Rekonsiliasi Inventory dasar termasuk upload laporan mitra (7.12, 7.13) 

- Detail Zona (drill-down) sebagai lapisan tampilan atas data yang sudah ada (7.6.1) 

### **11.2 Ditunda / Dicoret dari Roadmap** 

Tidak berubah dari v4.4 — Grid Editor drag-and-drop tetap dicoret total; parsing otomatis Compile Excel pada 7.13.3 dibatasi pada format template yang ditentukan tim produk (parsing format bebas/arbitrary didorong ke fase lanjut); resolusi konflik sinkronisasi penuh untuk input offline, laporan lanjutan & ekspor data kustom, dan Master Data Vendor eksternal (menunggu keputusan 0.1b) tetap berstatus sama seperti v4.4. 

## **13. Risiko & Mitigasi (Tambahan v4.5)** 

|**Risiko**|**Mitgasi**|
|---|---|
|(Baru v4.5) Migrasi istlah “Surat Tiket”/“Tiket Material”<br>→ “Tiket Gudang” berisiko membingungkan pengguna<br>yang sudah terbiasa dengan istlah lama di materi<br>pelathan/SOP|Materi pelathan & SOP diperbarui bersamaan dengan<br>rilis ftur; ditambahkan catatan sinonim sementara pada<br>UI/dokumentasi selama masa transisi|
|(Baru v4.5) Selisih MOS (Sistem) vs MOS (Laporan Mitra)<br>pada Rekonsiliasi Inventory berpotensi besar bila<br>frekuensi upload laporan mitra tdak konsisten|Notfkasi/reminder berkala ke mitra pelaksana untuk<br>upload rutn; tanggal upload terakhir ditampilkan jelas<br>pada tabel utama (7.13.1) agar Selisih dapat dibaca<br>dengan konteks kebaruan data|
|(Baru v4.5) Parsing otomats Compile Excel gagal/salah<br>baca bila format fle mitra tdak sesuai template|Validasi format saat upload dengan pesan error spesifk<br>per baris; ringkasan jumlah baris berhasil/gagal<br>ditampilkan di tab Riwayat Input Laporan Mitra (7.13.3)<br>agar mitra dapat memperbaiki & mengunggah ulang|
|(Baru v4.5) Klarifkasi sof delete pada 8.3 tetap<br>membutuhkan mekanisme UI yang jelas agar pengguna<br>tdak salah mengira data benar-benar hilang|Label status “Nonaktf” ditampilkan jelas pada baris<br>Master Data/user terkait; flter “tampilkan nonaktf”<br>tersedia agar riwayat tetap dapat ditelusuri Admin<br>General|



## **14. Lampiran (Tambahan v4.5)** 

### **14.9 Alur Pembuatan Project Inline dari Form Tiket Gudang (Baru v4.5)** 

Admin General/Supervisor membuka form Tiket Gudang baru → mengisi field dasar (BOQ terkait, gudang tujuan) → membuka dropdown Project → Project yang dicari belum ada di daftar → memilih “+ Buat project baru” → mengisi Nama Project/Cluster (RW) pada form inline → sistem memvalidasi nama tidak duplikat → Project baru tersimpan ke Master Data Project & otomatis terisi sebagai nilai field Project pada Tiket Gudang → pengguna melanjutkan pengisian Tiket Gudang seperti biasa. 

### **14.10 Alur Rekonsiliasi Inventory dengan Laporan Mitra (Baru v4.5)** 

Mitra pelaksana menyusun Compile Excel berisi data MOS di lapangan → Supervisor/Admin General mengunggah file lewat tab Riwayat Input Laporan Mitra (7.13.3) → sistem mem-parsing & memvalidasi format → hasil (berhasil/gagal per baris) tercatat sebagai entri riwayat baru (appendonly) → kolom MOS (Laporan Mitra) pada tabel utama (7.13.1) diperbarui mengacu ke upload terbaru per Project → sistem menghitung Selisih terhadap MOS (Sistem) → baris dengan Selisih ≠ 0 ditandai sebagai perlu perhatian → Admin General/Supervisor menindaklanjuti secara operasional di luar sistem (mis. verifikasi fisik) bila diperlukan. 

### **14.11 Alur Klik Detail Zona (Baru v4.5)** 

Pengguna membuka halaman Layout Gudang → memilih gudang (Cimahi/Rancamanyar) → denah menampilkan Zona A/B/C/D dengan tipe Indoor/Outdoor → pengguna mengklik salah satu Zona → panel Detail Zona terbuka menampilkan snapshot stok per Kode Perangkat di Zona tsb. → pengguna dapat mengklik “Lihat Riwayat Stok” → sistem membuka tab Riwayat Stok (7.12.2) dengan filter Gudang & Zona otomatis terisi sesuai Zona yang diklik. 

