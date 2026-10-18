# 03 - Dokumentasi API

## Daftar Isi
- [Auth](#auth)
- [Users](#users)

## Auth

### POST /api/auth/login
- Fungsi: Autentikasi user, mengembalikan access token & refresh token (rotation-ready).
- Role: Publik
- Rate limit: loginLimiter
- Header: Content-Type: application/json
- Body: email (string, Ya), password (string, Ya)
- Response (200): success=true, data: { user, token, refreshToken }
- Error: 400, 401, 403, 429

### POST /api/auth/forgot-password
- Fungsi: Request reset password (response generik)
- Role: Publik
- Rate limit: passwordResetLimiter
- Header: Content-Type: application/json
- Body: email (string, Ya)
- Response (200): pesan generik
- Error: 429

### POST /api/auth/reset-password
- Fungsi: Reset password dengan token
- Role: Publik
- Rate limit: passwordResetLimiter
- Header: Content-Type: application/json
- Body: email (string, Ya), token (string, Ya), newPassword (string, Ya)
- Response (200): sukses
- Error: 400, 404, 429

### PUT /api/auth/change-password
- Fungsi: Ubah password user login (mencabut semua refresh token aktif)
- Role: Autentikasi wajib
- Middleware: authenticate, validate
- Header: Authorization: Bearer <access_token>, Content-Type: application/json
- Body: currentPassword (string, Ya), newPassword (string, Ya), refreshToken (string, Tidak)
- Response (200): sukses
- Error: 400, 401, 403

### POST /api/auth/refresh
- Fungsi: Refresh access token (token rotation)
- Role: Publik
- Rate limit: refreshLimiter
- Header: Content-Type: application/json
- Body: refreshToken (string, Ya)
- Response (200): token + refreshToken baru
- Error: 401, 429

### POST /api/auth/logout
- Fungsi: Logout (revoke refresh token spesifik atau semua)
- Role: Autentikasi wajib
- Middleware: authenticate
- Header: Authorization: Bearer <access_token>
- Body: refreshToken (string, Tidak)
- Response (200): sukses
- Error: 401

### GET /api/auth/me
- Fungsi: Ambil data user dari token
- Role: Autentikasi wajib
- Middleware: authenticate
- Header: Authorization: Bearer <access_token>
- Response (200): data user
- Error: 401

### GET /api/auth/admin
- Fungsi: Test endpoint role ADMIN
- Role: Autentikasi wajib + ADMIN (admin_general)
- Middleware: authenticate, authorize('ADMIN')
- Header: Authorization: Bearer <access_token>
- Response (200): message + user
- Error: 401, 403
- Catatan: Endpoint pengujian otorisasi role ADMIN.

## Users

### PATCH /api/users/me/avatar
- Fungsi: Perbarui foto profil user login
- Role: Autentikasi wajib
- Middleware: authenticate, avatarUpload (multer, max 2MB, jpg/jpeg/png/webp)
- Header: Authorization: Bearer <access_token>, Content-Type: multipart/form-data
- Body: avatar (file, Ya)
- Response (200): success, data: { foto }
- Error: 400, 401, 404

### DELETE /api/users/me/avatar
- Fungsi: Hapus foto profil user login
- Role: Autentikasi wajib
- Middleware: authenticate
- Header: Authorization: Bearer <access_token>
- Response (200): success, data: { foto: null }
- Error: 401, 404

### POST /api/users
- Fungsi: Buat akun user baru (otomatis membuat personil + PIC gudang)
- Role: Autentikasi wajib + ADMIN
- Middleware: authenticate, authorize('ADMIN'), validate(createUserSchema)
- Header: Authorization: Bearer <access_token>, Content-Type: application/json
- Body:
  - nama (string, Ya, 3-100 karakter)
  - email (string, Ya, format valid)
  - password (string, Ya, strong password)
  - role (enum: admin_general, supervisor, staf_gudang)
  - is_aktif (boolean, optional)
  - no_telepon (string, optional)
  - gudang_id (string/number, optional, wajib untuk staf_gudang)
  - personil_id (string/number, optional)
- Response (201): success, data: { user_id, nama, email, role, is_aktif, personil_id, foto, nik, posisi, no_telepon, gudang_id, gudang nama, gudang, personils }
- Error: 400, 401, 403

### GET /api/users
- Fungsi: Daftar semua user (pagination, search, sort)
- Role: Autentikasi wajib + ADMIN
- Middleware: authenticate, authorize('ADMIN')
- Header: Authorization: Bearer <access_token>
- Query:
  - page (number, optional, default 1)
  - limit (number, optional, default 10)
  - search (string, optional, cari nama/email/role)
  - sortBy (string, optional, default updated_at, allowed: user_id, nama, email, role, is_aktif, created_at, updated_at)
  - sortOrder (string, optional, default desc, allowed: asc, desc)
  - include_inactive (boolean, optional, default false)
- Response (200): success, data: { data: [...], meta: { total, page, limit, totalPages } }
- Error: 401, 403

### GET /api/users/:user_id
- Fungsi: Detail akun user berdasarkan ID
- Role: Autentikasi wajib + ADMIN
- Middleware: authenticate, authorize('ADMIN')
- Header: Authorization: Bearer <access_token>
- Response (200): success, data: { user_id, nama, email, role, is_aktif, personil_id, foto, nik, posisi, no_telepon, gudang_id, gudang nama, gudang, personils }
- Error: 401, 403, 404

### PUT /api/users/:user_id
- Fungsi: Perbarui data akun user (termasuk password, revoke refresh token jika password diubah)
- Role: Autentikasi wajib + ADMIN
- Middleware: authenticate, authorize('ADMIN'), validate(updateUserSchema)
- Header: Authorization: Bearer <access_token>, Content-Type: application/json
- Body:
  - nama (string, optional)
  - email (string, optional)
  - password (string, optional)
  - role (enum, optional)
  - is_aktif (boolean, optional)
  - no_telepon (string, optional)
  - gudang_id (string/number, optional)
  - personil_id (string/number, optional)
  - Catatan: minimal satu field harus diupdate; tidak dapat menonaktifkan akun sendiri
- Response (200): success, data: { user_id, nama, email, role, is_aktif, ... }
- Error: 400, 401, 403, 404

### POST /api/users/:user_id/reset-link
- Fungsi: Buat link reset password untuk user (admin)
- Role: Autentikasi wajib + ADMIN
- Middleware: authenticate, authorize('ADMIN'), passwordResetLimiter
- Header: Authorization: Bearer <access_token>
- Response (200): success, data: { resetUrl, expires }
- Error: 401, 403, 404, 429








