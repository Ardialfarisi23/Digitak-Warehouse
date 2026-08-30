-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "approval_tahap" ADD VALUE 'inbound_verifikasi';
ALTER TYPE "approval_tahap" ADD VALUE 'inbound_putaway';
ALTER TYPE "approval_tahap" ADD VALUE 'outbound_approval';
ALTER TYPE "approval_tahap" ADD VALUE 'outbound_delivery';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_aksi" ADD VALUE 'receive_inbound';
ALTER TYPE "audit_aksi" ADD VALUE 'approve_inbound';
ALTER TYPE "audit_aksi" ADD VALUE 'approve_outbound';
ALTER TYPE "audit_aksi" ADD VALUE 'confirm_distributed';
ALTER TYPE "audit_aksi" ADD VALUE 'reject_inbound';
ALTER TYPE "audit_aksi" ADD VALUE 'reject_outbound';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "surat_jalan_status" ADD VALUE 'menunggu_verifikasi';
ALTER TYPE "surat_jalan_status" ADD VALUE 'ready_putaway';
ALTER TYPE "surat_jalan_status" ADD VALUE 'ditolak';

-- DropIndex
DROP INDEX "public"."idx_zona_gudang_dinilai_oleh";

-- AlterTable
ALTER TABLE "zona_gudang" ALTER COLUMN "dinilai_pada" SET DATA TYPE TIMESTAMP(3);

-- RenameForeignKey
ALTER TABLE "stok_gudang" RENAME CONSTRAINT "fk_stok_gudang_zona_id" TO "stok_gudang_zona_id_fkey";

-- RenameForeignKey
ALTER TABLE "surat_jalan_item" RENAME CONSTRAINT "fk_surat_jalan_item_zona_id" TO "surat_jalan_item_zona_id_fkey";

-- RenameForeignKey
ALTER TABLE "zona_gudang" RENAME CONSTRAINT "fk_zona_gudang_dinilai_oleh" TO "zona_gudang_dinilai_oleh_fkey";
