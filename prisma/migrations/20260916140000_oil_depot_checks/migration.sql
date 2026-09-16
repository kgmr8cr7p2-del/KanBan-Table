CREATE TABLE "OilDepotCheck" (
    "depotKey" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "OilDepotCheck_pkey" PRIMARY KEY ("depotKey")
);
ALTER TABLE "OilDepotCheck" ADD CONSTRAINT "OilDepotCheck_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
