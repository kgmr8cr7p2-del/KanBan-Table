import { prisma } from "@/lib/prisma";

function startOfWeek(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now).map((part) => [part.type, part.value]),
  );
  const moscowMidnight = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+03:00`);
  const day = moscowMidnight.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  moscowMidnight.setUTCDate(moscowMidnight.getUTCDate() - diff);
  return moscowMidnight;
}

function isCompletedColumn(name: string) {
  const normalized = name.toLowerCase();
  return normalized.includes("готов") || normalized.includes("done") || normalized.includes("complete");
}

function isWorkColumn(name: string) {
  const normalized = name.toLowerCase();
  return normalized.includes("работ") || normalized.includes("progress") || normalized.includes("doing");
}

function isReviewColumn(name: string) {
  const normalized = name.toLowerCase();
  return normalized.includes("провер") || normalized.includes("review") || normalized.includes("verify") || normalized.includes("approval");
}

export async function getWeeklyReport() {
  const weekStart = startOfWeek();
  const now = new Date();

  const [allTasks, weeklyActivity] = await Promise.all([
    prisma.task.findMany({
      where: { archivedAt: null },
      include: {
        column: { select: { name: true } },
        oilDepot: { select: { name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { createdAt: { gte: weekStart } },
      include: {
        task: {
          include: {
            column: { select: { name: true } },
            oilDepot: { select: { name: true } },
            assignee: { select: { id: true, name: true, email: true } },
            author: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const createdThisWeek = allTasks.filter((t) => t.createdAt >= weekStart);
  const completedById = new Map<string, NonNullable<(typeof weeklyActivity)[number]["task"]>>();
  for (const event of weeklyActivity) {
    if (event.action !== "STATUS_CHANGED" || !event.task || !isCompletedColumn(activityColumn(event.details))) continue;
    completedById.set(event.task.id, event.task);
  }
  const completedThisWeek = Array.from(completedById.values());
  const active = allTasks.filter((t) => !isCompletedColumn(t.column.name));
  const inProgress = active.filter((t) => isWorkColumn(t.column.name));
  const inReview = active.filter((t) => isReviewColumn(t.column.name));
  const overdue = active.filter(
    (t) => t.deadline && t.deadline < now && !isReviewColumn(t.column.name),
  );
  const critical = active.filter((t) => t.priority === "CRITICAL");

  const byAssignee = new Map<string, { name: string; created: number; completed: number; active: number; overdue: number }>();
  for (const t of createdThisWeek) {
    const a = t.assignee;
    const key = a?.id ?? "__unassigned";
    if (!byAssignee.has(key)) {
      byAssignee.set(key, { name: a?.name ?? "Не назначен", created: 0, completed: 0, active: 0, overdue: 0 });
    }
    byAssignee.get(key)!.created += 1;
  }
  for (const t of completedThisWeek) {
    const a = t.assignee;
    const key = a?.id ?? "__unassigned";
    if (!byAssignee.has(key)) {
      byAssignee.set(key, { name: a?.name ?? "Не назначен", created: 0, completed: 0, active: 0, overdue: 0 });
    }
    byAssignee.get(key)!.completed += 1;
  }
  for (const t of active) {
    const a = t.assignee;
    const key = a?.id ?? "__unassigned";
    if (!byAssignee.has(key)) {
      byAssignee.set(key, { name: a?.name ?? "Не назначен", created: 0, completed: 0, active: 0, overdue: 0 });
    }
    byAssignee.get(key)!.active += 1;
  }
  for (const t of overdue) {
    const a = t.assignee;
    const key = a?.id ?? "__unassigned";
    if (!byAssignee.has(key)) {
      byAssignee.set(key, { name: a?.name ?? "Не назначен", created: 0, completed: 0, active: 0, overdue: 0 });
    }
    byAssignee.get(key)!.overdue += 1;
  }

  const byDepot = new Map<string, { created: number; completed: number; active: number }>();
  for (const t of createdThisWeek) {
    const name = t.oilDepot?.name ?? "Без нефтебазы";
    if (!byDepot.has(name)) byDepot.set(name, { created: 0, completed: 0, active: 0 });
    byDepot.get(name)!.created += 1;
  }
  for (const t of completedThisWeek) {
    const name = t.oilDepot?.name ?? "Без нефтебазы";
    if (!byDepot.has(name)) byDepot.set(name, { created: 0, completed: 0, active: 0 });
    byDepot.get(name)!.completed += 1;
  }
  for (const t of active) {
    const name = t.oilDepot?.name ?? "Без нефтебазы";
    if (!byDepot.has(name)) byDepot.set(name, { created: 0, completed: 0, active: 0 });
    byDepot.get(name)!.active += 1;
  }

  return {
    period: {
      from: weekStart.toISOString(),
      to: now.toISOString(),
    },
    totals: {
      createdThisWeek: createdThisWeek.length,
      completedThisWeek: completedThisWeek.length,
      active: active.length,
      inProgress: inProgress.length,
      inReview: inReview.length,
      overdue: overdue.length,
      critical: critical.length,
      total: allTasks.length,
      commentsAdded: weeklyActivity.filter((event) => event.action === "COMMENT_ADDED").length,
      filesUploaded: weeklyActivity.filter((event) => event.action === "FILE_UPLOADED").length,
      checklistChanges: weeklyActivity.filter((event) => event.action === "CHECKLIST_CHANGED").length,
      statusChanges: weeklyActivity.filter((event) => event.action === "STATUS_CHANGED").length,
    },
    byAssignee: Array.from(byAssignee.values()).sort((a, b) => b.active - a.active),
    byDepot: Array.from(byDepot.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.active - a.active),
    topCreated: createdThisWeek
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((t) => ({
        taskNumber: t.taskNumber,
        title: t.title,
        author: t.author.name,
        depot: t.oilDepot?.name ?? "—",
      })),
    topCompleted: completedThisWeek
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map((t) => ({
        taskNumber: t.taskNumber,
        title: t.title,
        assignee: t.assignee?.name ?? "—",
        depot: t.oilDepot?.name ?? "—",
      })),
  };
}

function activityColumn(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const column = (details as Record<string, unknown>).column;
  return typeof column === "string" ? column : "";
}

export type WeeklyReport = Awaited<ReturnType<typeof getWeeklyReport>>;
