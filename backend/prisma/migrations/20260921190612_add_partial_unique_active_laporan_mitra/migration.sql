-- Partial unique index: only one active report per (tiket_id, tanggal_laporan, pic_mitra)
-- This enforces the business rule: maksimal 1 laporan aktif per hari per kombinasi tiket + tanggal + PIC
-- COALESCE is used because pic_mitra is nullable; without it, PostgreSQL treats each NULL as distinct,
-- allowing multiple "active" rows when pic_mitra is NULL. With COALESCE, NULLs are normalized to ''
-- so the uniqueness rule applies consistently regardless of whether PIC is provided.
CREATE UNIQUE INDEX IF NOT EXISTS "laporan_mitra_active_unique"
ON "laporan_mitra" ("tiket_id", "tanggal_laporan", (COALESCE("pic_mitra", '')))
WHERE "is_aktif" = true;
