ALTER TABLE "Notification" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general';

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "browserChat" BOOLEAN NOT NULL DEFAULT true,
  "browserMentions" BOOLEAN NOT NULL DEFAULT true,
  "browserTasks" BOOLEAN NOT NULL DEFAULT true,
  "browserDeadlines" BOOLEAN NOT NULL DEFAULT true,
  "browserSystem" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX "Notification_userId_category_readAt_createdAt_idx" ON "Notification"("userId", "category", "readAt", "createdAt");

ALTER TABLE "NotificationPreference"
ADD CONSTRAINT "NotificationPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
