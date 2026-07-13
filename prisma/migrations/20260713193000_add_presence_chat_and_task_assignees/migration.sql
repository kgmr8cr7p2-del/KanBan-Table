ALTER TABLE "User"
ADD COLUMN "currentActivity" TEXT NOT NULL DEFAULT 'В сети',
ADD COLUMN "lastActiveAt" TIMESTAMP(3);

CREATE TABLE "TaskAssignment" (
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("taskId", "userId")
);

CREATE INDEX "TaskAssignment_userId_idx" ON "TaskAssignment"("userId");

ALTER TABLE "TaskAssignment"
ADD CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "TaskAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TaskAssignment" ("taskId", "userId")
SELECT "id", "assigneeId" FROM "Task" WHERE "assigneeId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE "DirectMessage" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL DEFAULT '',
  "senderId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "fileName" TEXT,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DirectMessage_senderId_recipientId_createdAt_idx" ON "DirectMessage"("senderId", "recipientId", "createdAt");
CREATE INDEX "DirectMessage_recipientId_senderId_createdAt_idx" ON "DirectMessage"("recipientId", "senderId", "createdAt");

ALTER TABLE "DirectMessage"
ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
