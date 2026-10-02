ALTER TABLE "cluster"
  ADD COLUMN "pic_id" BIGINT;

CREATE INDEX "cluster_pic_id_idx" ON "cluster"("pic_id");

ALTER TABLE "cluster"
  ADD CONSTRAINT "cluster_pic_id_fkey"
  FOREIGN KEY ("pic_id")
  REFERENCES "personil"("personil_id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
