export const CHECK_AFTER_DAYS = 30;
export const DEPOT_OWNERS = ["Немых Д.Д.", "Москаленко Н.Т.", "Лесин В.В."] as const;

export function depotKey(name: string) {
  const key = name.toLocaleLowerCase("ru").replaceAll("ё", "е")
    .replace(/нефтебаза/gu, "").replace(/^\s*нб[\s.-]+/u, "").replace(/[^а-яa-z0-9]/gu, "");
  // Keep directory keys stable: inspection records are stored under these keys.
  // Use explicit aliases, not fuzzy matching that could merge different depots.
  const aliases: Record<string, string> = {
    нтагил: "нижнийтагил", тагил: "нижнийтагил",
    омская: "омск", челябинская: "челябинск",
    ивановская: "иваново", сокурская: "сокур",
  };
  return aliases[key] ?? key;
}

export type DepotSource = { name: string; owner: string; os: string; timezone: string; equipment: string };
export type DepotTask = {
  id: string; taskNumber: number; title: string; columnName: string; boardId: string;
  deadline: string | null; archivedAt: string | null; createdAt: string; updatedAt: string;
  lastEventAt: string | null;
};
export type DepotSummary = DepotSource & {
  key: string; matched: boolean; active: number; completed: number; overdue: number;
  lastActivityAt: string | null; checkedAt: string | null; checkedBy: string | null;
  idleDays: number | null; needsCheck: boolean;
  tasks: { id: string; number: number; title: string; status: string; href: string; overdue: boolean }[];
};

function completed(name: string) {
  return /готов|done|complete/i.test(name);
}

function latest(dates: (string | null)[]) {
  return dates.filter((d): d is string => d !== null)
    .reduce<string | null>((result, date) => !result || Date.parse(date) > Date.parse(result) ? date : result, null);
}

export function summarizeDepot(source: DepotSource, tasks: DepotTask[], check: {
  checkedAt: string; checkedBy: string | null;
} | null, matched: boolean, now: Date): DepotSummary {
  // Deadlines are calendar dates, matching the board's daily deadline convention.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const open = tasks.filter(t => !t.archivedAt && !completed(t.columnName));
  const isOverdue = (t: DepotTask) => Boolean(t.deadline && t.deadline.slice(0, 10) < today);
  // Automatic archival changes updatedAt; it is not work performed on an object.
  const lastActivityAt = latest(tasks.flatMap(t => [t.createdAt, t.archivedAt ? null : t.updatedAt, t.lastEventAt]));
  const lastTouch = latest([lastActivityAt, check?.checkedAt ?? null]);
  const idleDays = lastTouch ? Math.max(0, Math.floor((now.getTime() - Date.parse(lastTouch)) / 86_400_000)) : null;
  return {
    ...source, key: depotKey(source.name), matched,
    active: open.length, completed: tasks.filter(t => !t.archivedAt && completed(t.columnName)).length,
    overdue: open.filter(isOverdue).length,
    lastActivityAt, checkedAt: check?.checkedAt ?? null, checkedBy: check?.checkedBy ?? null,
    idleDays, needsCheck: idleDays === null || idleDays >= CHECK_AFTER_DAYS,
    tasks: open.sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")).map(t => ({
      id: t.id, number: t.taskNumber, title: t.title, status: t.columnName, overdue: isOverdue(t),
      href: `/board?${new URLSearchParams({ board: t.boardId, q: String(t.taskNumber) })}`,
    })),
  };
}
