import { prisma } from "@/lib/prisma";

const COMPLETED_TASK_RETENTION_DAYS = 30;
const LEGACY_DONE_TEXT = "РіРѕС‚РѕРІ".toLowerCase();

export async function cleanupOldCompletedTasks() {
  const cutoff = new Date(Date.now() - COMPLETED_TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const completedColumns = await prisma.column.findMany({
    where: {
      OR: [
        { name: { contains: "готов", mode: "insensitive" } },
        { name: { contains: "РіРѕС‚РѕРІ", mode: "insensitive" } },
        { name: { contains: "done", mode: "insensitive" } },
        { name: { contains: "complete", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  const completedColumnIds = completedColumns.map((column) => column.id);
  if (!completedColumnIds.length) return;

  const candidates = await prisma.task.findMany({
    where: {
      archivedAt: null,
      columnId: { in: completedColumnIds },
    },
    select: {
      id: true,
      updatedAt: true,
      activityLogs: {
        where: { action: "STATUS_CHANGED" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, details: true },
        take: 20,
      },
    },
  });

  const taskIds = candidates
    .filter((task) => {
      const movedToCompletedAt = task.activityLogs.find((log) => {
        const columnName = String((log.details as any)?.column ?? "").toLowerCase();
        return columnName.includes("готов") || columnName.includes(LEGACY_DONE_TEXT) || columnName.includes("done") || columnName.includes("complete");
      })?.createdAt;
      return (movedToCompletedAt ?? task.updatedAt) < cutoff;
    })
    .map((task) => task.id);

  if (!taskIds.length) return;

  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: { archivedAt: new Date() },
  });
}
