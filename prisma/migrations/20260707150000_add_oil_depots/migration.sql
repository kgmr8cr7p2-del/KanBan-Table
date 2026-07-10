CREATE TABLE "OilDepot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OilDepot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OilDepot_name_key" ON "OilDepot"("name");

INSERT INTO "OilDepot" ("id", "name", "active", "createdAt", "updatedAt")
VALUES ('default-oil-depot', 'Не указана', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Task" ADD COLUMN "oilDepotId" TEXT;

UPDATE "Task" SET "oilDepotId" = 'default-oil-depot' WHERE "oilDepotId" IS NULL;

ALTER TABLE "Task" ALTER COLUMN "oilDepotId" SET NOT NULL;

ALTER TABLE "Task" ADD CONSTRAINT "Task_oilDepotId_fkey" FOREIGN KEY ("oilDepotId") REFERENCES "OilDepot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
