import { prisma } from "@/lib/prisma";
import sources from "@/data/oil-depots.json";
import { depotKey, summarizeDepot } from "@/lib/oil-depot-summary";

export async function getOilDepotDashboard() {
  const [depots, checks] = await Promise.all([
    prisma.oilDepot.findMany({
      select: {
        name: true,
        tasks: {
          // Team metrics must not reveal or be affected by somebody's private board.
          where: { column: { board: { ownerId: null } } },
          select: {
            id: true, taskNumber: true, title: true, deadline: true, archivedAt: true,
            createdAt: true, updatedAt: true,
            column: { select: { name: true, boardId: true } },
            activityLogs: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
          },
        },
      },
    }),
    prisma.oilDepotCheck.findMany({ include: { user: { select: { name: true } } } }),
  ]);
  const now = new Date();
  return sources.map(source => {
    const key = depotKey(source.name);
    const matches = depots.filter(d => depotKey(d.name) === key);
    const check = checks.find(c => c.depotKey === key);
    return summarizeDepot(source, matches.flatMap(d => d.tasks.map(t => ({
      id: t.id, taskNumber: t.taskNumber, title: t.title, columnName: t.column.name, boardId: t.column.boardId,
      deadline: t.deadline?.toISOString() ?? null, archivedAt: t.archivedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
      lastEventAt: t.activityLogs[0]?.createdAt.toISOString() ?? null,
    }))), check ? { checkedAt: check.checkedAt.toISOString(), checkedBy: check.user?.name ?? null } : null, matches.length > 0, now);
  });
}
