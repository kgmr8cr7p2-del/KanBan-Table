type DeadlineTask = { deadline?: string | null; column?: { name?: string | null } | null };
export function isCompletedColumn(name: string) {
  const normalized = name.toLowerCase();
  return normalized.includes("готов") || normalized.includes("done") || normalized.includes("complete") || normalized.includes("РіРѕС‚РѕРІ".toLowerCase());
}

export function isReviewColumn(name: string) {
  const normalized = name.toLowerCase();
  return normalized.includes("провер") || normalized.includes("review") || normalized.includes("verify") || normalized.includes("approval") || normalized.includes("РїСЂРѕРІРµСЂ".toLowerCase());
}

export function isOverdue(task: DeadlineTask) {
  return Boolean(task.deadline && new Date(task.deadline).getTime() < startOfToday().getTime() && !isCompletedColumn(task.column?.name ?? "") && !isReviewColumn(task.column?.name ?? ""));
}

export function isDueToday(task: DeadlineTask) {
  if (!task.deadline) return false;
  const deadline = new Date(task.deadline);
  const today = startOfToday();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return deadline >= today && deadline < tomorrow;
}

export function isDueSoon(task: DeadlineTask) {
  if (!task.deadline || isCompletedColumn(task.column?.name ?? "") || isReviewColumn(task.column?.name ?? "")) return false;
  const deadline = new Date(task.deadline).getTime();
  const soon = startOfToday().getTime() + 4 * 24 * 60 * 60 * 1000;
  const tomorrow = new Date(startOfToday());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return deadline >= tomorrow.getTime() && deadline <= soon;
}

export function deadlineTone(task: DeadlineTask) {
  if (isCompletedColumn(task.column?.name ?? "")) return "deadline-normal";
  if (isReviewColumn(task.column?.name ?? "")) return "deadline-review";
  if (isOverdue(task)) return "deadline-overdue";
  if (isDueToday(task)) return "deadline-today";
  if (isDueSoon(task)) return "deadline-soon";
  return "deadline-normal";
}

export function deadlineText(task: DeadlineTask) {
  if (!task.deadline) return "Без срока";
  if (isCompletedColumn(task.column?.name ?? "")) return dateOnly(task.deadline);
  if (isReviewColumn(task.column?.name ?? "")) return "На согласовании";
  if (isOverdue(task)) return `Просрочено · ${dateOnly(task.deadline)}`;
  if (isDueToday(task)) return "Сегодня";
  if (isDueSoon(task)) return `Скоро · ${dateOnly(task.deadline)}`;
  return dateOnly(task.deadline);
}


function startOfToday() { const today = new Date(); today.setHours(0, 0, 0, 0); return today; }
function dateOnly(value: string) { return new Intl.DateTimeFormat("ru-RU").format(new Date(value)); }
