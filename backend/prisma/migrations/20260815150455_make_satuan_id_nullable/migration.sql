-- DropForeignKey
ALTER TABLE "public"."boq_item" DROP CONSTRAINT "boq_item_satuan_id_fkey";

-- AlterTable
ALTER TABLE "boq_item" ALTER COLUMN "satuan_id" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "boq_item_satuan_id_idx" ON "boq_item"("satuan_id");

-- AddForeignKey
ALTER TABLE "boq_item" ADD CONSTRAINT "boq_item_satuan_id_fkey" FOREIGN KEY ("satuan_id") REFERENCES "satuan"("satuan_id") ON DELETE SET NULL ON UPDATE CASCADE;
