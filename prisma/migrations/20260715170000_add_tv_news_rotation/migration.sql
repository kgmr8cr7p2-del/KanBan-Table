CREATE TABLE "TvNewsItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TvNewsItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TvNewsItem_sourceId_key" ON "TvNewsItem"("sourceId");
CREATE INDEX "TvNewsItem_shownAt_idx" ON "TvNewsItem"("shownAt");
