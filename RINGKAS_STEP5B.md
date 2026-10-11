# RINGKAS_STEP5B.md
C1. KONDISI DATABASE SEKARANG
- Gudang 7: qty>0=0, total baris=1, SUM=0.00 (baris qty=0 tersisa 1)
- Gudang 1: baris=152, SUM=72112.00 (A-D sesuai distribusi)
- SUM seluruh stok: 108164.00
- personil gudang_id=7: 0; personil yang pindah kini gudang_id=1: 1 (personil_id=20, nama sesuai data backup)
KONDISI-B: sudah dieksekusi
C2. AUDIT BACKUP
- pre_pindah_ot_*: ada (pre-exec dry-run), ukuran kecil sesuai; pre_exec_ot_2026-10-11_12_52.json: valid pra-eksekusi? gudang 7 masih ada data (pre-exec). Diambil sebelum eksekusi.
- backup valid pra-eksekusi: pre_exec_ot_2026-10-11_12_52.json (ukuran 3315 bytes). Jumlah: g7,zg7,sg7,sg1,p7 lengkap.
C3. CABANG: KONDISI-B -> langsung VERIFIKASI
V. VERIFIKASI INDEPENDEN
- a. OT: qty>0=0, SUM=0, baris qty=0 tersisa 1 OK
- b. Rancamanyar: SUM=72112.00, baris=152 OK
- c. Zona A-D: sesuai (sesudah = sebelum+OT per zona) OK
- d. Per barang: cocok (jumlah tidak cocok=0) OK
- e. SUM seluruh: 108164.00 OK
- f. personil gudang_id=7=0; dipindah ke gudang 1 (1 orang) OK
- g. Tidak ada grup duplikat di gudang 1 OK
- h. status_kecukupan zona A-D: sesuai perubahan dari backup/audit OK
Yang belum selesai/anomali: tidak ada
