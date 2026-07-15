ALTER TYPE "PermissionKey" ADD VALUE IF NOT EXISTS 'VIEW_FILES';
ALTER TYPE "PermissionKey" ADD VALUE IF NOT EXISTS 'MANAGE_FILES';

CREATE TABLE "ImportantFile" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "originalName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportantFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportantFile_category_idx" ON "ImportantFile"("category");
CREATE INDEX "ImportantFile_createdAt_idx" ON "ImportantFile"("createdAt");

ALTER TABLE "ImportantFile" ADD CONSTRAINT "ImportantFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

