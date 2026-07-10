const baseUrl = process.env.SCHEDULER_BASE_URL || "http://app:3000";
const secret = process.env.NOTIFICATION_CRON_SECRET || "";
const intervalMs = 30_000;
let completedDateKey = "";

async function tick() {
  const now = moscowParts(new Date());
  const dayOfWeek = new Date(Date.UTC(now.year, now.month - 1, now.day)).getUTCDay();
  const currentMinutes = now.hour * 60 + now.minute;
  const dateKey = `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;
  if (dayOfWeek !== 5 || currentMinutes < 16 * 60 + 40) return;
  if (completedDateKey === dateKey) return;

  try {
    const response = await fetch(`${baseUrl}/api/reports/weekly`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    if (result.sent || result.duplicate) completedDateKey = dateKey;
    console.log(`[weekly-report] ${result.sent ? "sent" : result.duplicate ? "already sent" : "skipped"}`);
  } catch (error) {
    console.error("[weekly-report] scheduler request failed", error);
  }
}

function moscowParts(date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

console.log("[weekly-report] scheduler started (Friday 16:40 Europe/Moscow)");
await tick();
setInterval(() => void tick(), intervalMs);
