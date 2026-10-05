-- Status saat Surat Jalan outbound sedang dititipkan di Gudang Transit.
ALTER TYPE "surat_jalan_status" ADD VALUE IF NOT EXISTS 'tiba_di_transit';

-- Perbaiki enum audit untuk aksi lapor tiba yang sudah ditulis service.
ALTER TYPE "audit_aksi" ADD VALUE IF NOT EXISTS 'report_arrival';

-- Aksi checkpoint perjalanan Gudang Transit.
ALTER TYPE "audit_aksi" ADD VALUE IF NOT EXISTS 'tiba_di_transit';
ALTER TYPE "audit_aksi" ADD VALUE IF NOT EXISTS 'lanjut_dari_transit';

CREATE TABLE "surat_jalan_transit" (
    "transit_id" BIGSERIAL NOT NULL,
    "surat_jalan_id" BIGINT NOT NULL,
    "gudang_id" BIGINT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "tiba_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tiba_by" BIGINT NOT NULL,
    "berangkat_at" TIMESTAMP(3),
    "berangkat_by" BIGINT,
    "catatan_tiba" TEXT,
    "catatan_berangkat" TEXT,
    "bukti_url" TEXT,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surat_jalan_transit_pkey" PRIMARY KEY ("transit_id")
);

CREATE UNIQUE INDEX "surat_jalan_transit_surat_jalan_id_urutan_key"
    ON "surat_jalan_transit"("surat_jalan_id", "urutan");
CREATE INDEX "surat_jalan_transit_surat_jalan_id_berangkat_at_idx"
    ON "surat_jalan_transit"("surat_jalan_id", "berangkat_at");
CREATE INDEX "surat_jalan_transit_gudang_id_idx"
    ON "surat_jalan_transit"("gudang_id");

ALTER TABLE "surat_jalan_transit"
    ADD CONSTRAINT "surat_jalan_transit_surat_jalan_id_fkey"
    FOREIGN KEY ("surat_jalan_id") REFERENCES "surat_jalan"("surat_jalan_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "surat_jalan_transit"
    ADD CONSTRAINT "surat_jalan_transit_gudang_id_fkey"
    FOREIGN KEY ("gudang_id") REFERENCES "gudang"("gudang_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "surat_jalan_transit"
    ADD CONSTRAINT "surat_jalan_transit_tiba_by_fkey"
    FOREIGN KEY ("tiba_by") REFERENCES "user_account"("user_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "surat_jalan_transit"
    ADD CONSTRAINT "surat_jalan_transit_berangkat_by_fkey"
    FOREIGN KEY ("berangkat_by") REFERENCES "user_account"("user_id")
    ON DELETE SET NULL ON UPDATE CASCADE;
