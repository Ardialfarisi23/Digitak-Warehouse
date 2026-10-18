# 02 - Instalasi & Variabel Lingkungan

## Prasyarat

- **Node.js**: >= 18.x
- **PostgreSQL**: >= 14.x
- **npm**: sesuai Node.js
- **Git**: untuk clone repository
- **Prisma CLI**: dipakai via npx (prisma ^6.19.3 terinstall di backend)

## Langkah Instalasi Lokal (berurutan)

### 1. Clone repository
```bash
git clone https://github.com/Ardialfarisi23/Digitak-Warehouse.git
cd Digitak-Warehouse
```

### 2. Setup Backend
```bash
cd backend
npm install
```

### 3. Setup Environment Backend
Buat file .env di backend/ berdasarkan backend/.env.example. Minimal wajib:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/digitak_warehouse?schema=public
JWT_SECRET=change-me-to-a-long-random-string
JWT_REFRESH_SECRET=change-me-to-another-long-random-string
PORT=5000
NODE_ENV=development
```

### 4. Setup Database & Prisma
Pastikan PostgreSQL berjalan dan database digitak_warehouse sudah dibuat:
```bash
psql -U postgres
CREATE DATABASE digitak_warehouse;
\q
```

Lalu di folder backend/:
```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Seed data (opsional tapi disarankan)
```bash
npm run seed
```
### 6. Jalankan backend (npm run dev)
```bash
cd backend
npm run dev
```
Backend berjalan di http://localhost:5000
Buka terminal baru:
`ash
cd frontend
npm install
`
Buat file .env.local di frontend/:
`env
NEXT_PUBLIC_API_URL=http://localhost:5000
`
### 8. Jalankan Frontend
`ash
npm run dev
`
Frontend berjalan di http://localhost:3000.

### 9. Verifikasi
Buka http://localhost:3000 dan login dengan akun hasil seed.
## Tabel Variabel Lingkungan
### Backend (backend/.env)
| Nama | Wajib/Opsional | Fungsi | Contoh nilai |
|---|---|---|---|
| DATABASE_URL | Wajib | Koneksi PostgreSQL untuk Prisma | postgresql://postgres:postgres@localhost:5432/digitak_warehouse?schema=public |
| JWT_SECRET | Wajib | Secret access token | REPLACE_WITH_LONG_RANDOM_SECRET |
| JWT_REFRESH_SECRET | Wajib | Secret refresh token | REPLACE_WITH_LONG_RANDOM_REFRESH_SECRET |
| JWT_REFRESH_EXPIRES | Opsional | Default: 3d | 3d |
| JWT_ACCESS_EXPIRES | Opsional | Default: 60m | 60m |
| PORT | Opsional | Default: 5000 | 5000 |
| NODE_ENV | Opsional | Default: development | development |
| FRONTEND_URL | Opsional | URL frontend | http://localhost:3000 |
| TRUST_PROXY | Opsional | Express trust proxy | true |
| SEED_DEFAULT_PASSWORD | Opsional (dev only) | Jangan dipakai di production | DevSeed123 |
| LONGGAR_LOGIN_LIMIT | Opsional | Default: 20 | 20 |
| LONGGAR_LOGIN_WINDOW | Opsional | Default: 15 | 15 |
| LONGGAR_PASSWORD_RESET_LIMIT | Opsional | Default: 10 | 10 |
| LONGGAR_PASSWORD_RESET_WINDOW | Opsional | Default: 15 | 15 |
| LONGGAR_REFRESH_LIMIT | Opsional | Default: 60 | 60 |
| LONGGAR_REFRESH_WINDOW | Opsional | Default: 15 | 15 |
| LONGGAR_UPLOAD_LIMIT | Opsional | Default: 60 | 60 |
| LONGGAR_UPLOAD_WINDOW | Opsional | Default: 15 | 15 |
| LONGGAR_DELETE_LIMIT | Opsional | Default: 60 | 60 |
| LONGGAR_DELETE_WINDOW | Opsional | Default: 15 | 15 |

### Frontend (frontend/.env.local)
| Nama | Wajib/Opsional | Fungsi | Contoh nilai |
|---|---|---|---|
| NEXT_PUBLIC_API_URL | Wajib (dev) | Base URL API | http://localhost:5000 |

> Catatan: allowedOrigins di backend/src/app.js hardcoded (bukan dari env). Untuk produksi wajib tambahkan domain frontend ke whitelist.

## Perintah Penting
### Backend
`ash
npm run dev
npm start
npm run seed
npm test
npm run seed:picking:test
npm run seed:picking:test:apply
npm run seed:picking:test:restore
npm run verify:picking
`
### Frontend
`ash
npm run dev
npm run build
npm start
npm run lint
npm run test
npm run test:e2e
npm run test:blackbox
`
### Prisma
`ash
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma studio
npx prisma migrate reset
`

## Panduan Deployment Singkat (Produksi)
- Docker/Compose: Tidak ditemukan docker-compose.yml/Dockerfile siap pakai di root.
- Backend: npm ci (atau npm install --omit=dev), npx prisma generate, npx prisma migrate deploy, npm start. Atur NODE_ENV=production, DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET kuat & berbeda. Sesuaikan PORT/reverse proxy, TRUST_PROXY jika behind proxy.
- Frontend: npm run build lalu npm start. Atur NEXT_PUBLIC_API_URL ke URL backend produksi. Sesuaikan images.remotePatterns di next.config.ts.
- CORS: Tambahkan domain frontend produksi ke allowedOrigins di backend/src/app.js.
- Uploads: backend/src/uploads/ statis - pastikan persistent (volume).
- Keamanan: Jangan commit .env. Jangan set SEED_DEFAULT_PASSWORD di produksi.

## Troubleshooting (5 masalah umum)
1. DB connection error (backend dev): Cek DATABASE_URL, PostgreSQL running, DB digitak_warehouse ada. Coba npx prisma migrate dev.
2. Prisma Client not generated: cd backend && npx prisma generate. Jika perlu, hapus node_modules/.prisma lalu install ulang.
3. JWT 401 / token tidak ditemukan: Pastikan JWT_SECRET/JWT_REFRESH_SECRET konsisten, clear localStorage, login ulang.
4. CORS blocked: Tambahkan origin frontend ke allowedOrigins di backend/src/app.js.
5. NEXT_PUBLIC_API_URL tidak terbaca: Buat frontend/.env.local, isi NEXT_PUBLIC_API_URL=http://localhost:5000, restart npm run dev.
