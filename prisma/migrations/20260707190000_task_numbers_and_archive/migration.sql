CREATE SEQUENCE IF NOT EXISTS "Task_taskNumber_seq";

ALTER TABLE "Task" ADD COLUMN "taskNumber" INTEGER;
ALTER TABLE "Task" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "archivedById" TEXT;

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS row_number
  FROM "Task"
)
UPDATE "Task"
SET "taskNumber" = numbered.row_number
FROM numbered
WHERE "Task"."id" = numbered."id";

SELECT setval('"Task_taskNumber_seq"', COALESCE((SELECT MAX("taskNumber") FROM "Task"), 0) + 1, false);

ALTER TABLE "Task" ALTER COLUMN "taskNumber" SET DEFAULT nextval('"Task_taskNumber_seq"');
ALTER TABLE "Task" ALTER COLUMN "taskNumber" SET NOT NULL;

CREATE UNIQUE INDEX "Task_taskNumber_key" ON "Task"("taskNumber");

ALTER TABLE "Task" ADD CONSTRAINT "Task_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
