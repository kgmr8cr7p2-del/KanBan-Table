CREATE TABLE "TaskSoundEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "soundUrl" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSoundEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskSoundEvent_createdAt_idx" ON "TaskSoundEvent"("createdAt");
CREATE INDEX "TaskSoundEvent_userId_createdAt_idx" ON "TaskSoundEvent"("userId", "createdAt");

ALTER TABLE "TaskSoundEvent"
ADD CONSTRAINT "TaskSoundEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
