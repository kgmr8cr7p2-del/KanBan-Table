UPDATE "User"
SET "interfaceMode" = 'new'
WHERE "interfaceMode" <> 'new';

ALTER TABLE "User"
ALTER COLUMN "interfaceMode" SET DEFAULT 'new';
