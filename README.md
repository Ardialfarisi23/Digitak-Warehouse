# Digitak Warehouse

Sistem manajemen gudang internal Digitak Studio untuk mengelola inbound, outbound, putaway, delivery, BOQ, rekonsiliasi, approval, dan operasional gudang berbasis role (Admin, Supervisor, Staf Gudang).

## Fitur Utama

- Manajemen master data (barang, kategori, satuan, gudang, zona, proyek, supplier, pelanggan, personil)
- Transaksi gudang (Surat Jalan: inbound/outbound, putaway, picking, distribusi)
- BOQ & Cluster, Permintaan BOQ
- Approval berbasis role (RBAC)
- Rekonsiliasi stok & laporan
- Autentikasi JWT (access + refresh token), audit log, rate limiting
- Dashboard per peran (Admin/Supervisor/Staf)

## Quick Start

1. **Clone**: git clone https://github.com/Ardialfarisi23/Digitak-Warehouse.git && cd Digitak-Warehouse
2. **Backend**: cd backend && npm install && cp .env.example .env (sesuaikan env), lalu 
px prisma generate && npx prisma migrate dev && npm run seed && npm run dev
3. **Frontend**: buka terminal baru, cd frontend && npm install && cp .env.local.example .env.local (atau buat .env.local dengan NEXT_PUBLIC_API_URL=http://localhost:5000), lalu 
pm run dev
4. **Akses**: buka http://localhost:3000 (frontend), backend http://localhost:5000
5. **Dokumentasi**: lihat [docs/](./docs)

## Dokumentasi Lengkap

Selengkapnya tersedia di folder [docs/](./docs) meliputi: Arsitektur, Instalasi, Dokumentasi API, Panduan Pengguna, Materi Pelatihan, Kebijakan Privasi, Syarat Penggunaan.
