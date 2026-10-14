ALTER TABLE "User" ADD COLUMN "taskMapPreference" TEXT NOT NULL DEFAULT 'board';
ALTER TABLE "Task" ADD COLUMN "parentId" TEXT;
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "TaskDependency" (
  "id" TEXT NOT NULL,
  "predecessorId" TEXT NOT NULL,
  "successorId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TaskDependency_predecessorId_successorId_key" ON "TaskDependency"("predecessorId", "successorId");
CREATE INDEX "TaskDependency_successorId_idx" ON "TaskDependency"("successorId");
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
