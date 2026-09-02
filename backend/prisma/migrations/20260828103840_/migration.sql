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

-- AlterTable
ALTER TABLE "surat_jalan" ADD COLUMN     "surat_jalan_url" TEXT;
