import { strict as assert } from "node:assert";
import { test } from "node:test";
import { depotKey, summarizeDepot, type DepotTask } from "../src/lib/oil-depot-summary";
import sources from "../src/data/oil-depots.json";

const now = new Date("2026-09-16T12:00:00.000Z");
const source = sources[0];
const task = (patch: Partial<DepotTask> = {}): DepotTask => ({
  id: "task1", taskNumber: 17, title: "Проверить сервер", columnName: "В работе", boardId: "team",
  deadline: null, archivedAt: null, createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-01T12:00:00.000Z", lastEventAt: null, ...patch,
});

test("17 depots assigned to the three confirmed people; Tagil belongs to Nemykh", () => {
  const counts = sources.reduce<Record<string, number>>((all, d) => ({ ...all, [d.owner]: (all[d.owner] ?? 0) + 1 }), {});
  assert.deepEqual(counts, { "Москаленко Н.Т.": 5, "Лесин В.В.": 5, "Немых Д.Д.": 7 });
  assert.equal(sources.find(d => d.name === "Нижний Тагил")?.owner, "Немых Д.Д.");
  assert.equal(new Set(sources.map(d => depotKey(d.name))).size, 17);
});
test("depot aliases join the existing database without changing records", () => {
  for (const name of ["Н.Тагил", "Нижний Тагил", "Тагил", "НБ Н.Тагил", "Нефтебаза Нижний Тагил"]) assert.equal(depotKey(name), "нижнийтагил");
  assert.equal(depotKey("Нефтебаза Кемерово"), depotKey("Кемерово"));
  for (const [directory, board] of [["Омск", "Омская"], ["Челябинск", "Челябинская"], ["Иваново", "Ивановская"], ["Сокур", "Сокурская"]]) {
    assert.equal(depotKey(board), depotKey(directory));
    assert.equal(depotKey(` НБ ${board.toUpperCase()} `), depotKey(directory));
  }
  assert.equal(depotKey("Омск"), "омск"); // Preserve existing inspection keys.
  assert.notEqual(depotKey("Омская-2"), depotKey("Омск"));
});
test("unknown history requests a first check and never invents an idle date", () => {
  const result = summarizeDepot(source, [], null, false, now);
  assert.equal(result.needsCheck, true); assert.equal(result.idleDays, null);
  assert.equal(result.lastActivityAt, null); assert.equal(result.matched, false);
});
test("30-day boundary, recent work, and explicit inspections", () => {
  const at = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
  assert.equal(summarizeDepot(source, [task({ updatedAt: at(30) })], null, true, now).needsCheck, true);
  assert.equal(summarizeDepot(source, [task({ updatedAt: at(30 - 1/86400) })], null, true, now).needsCheck, false);
  const checked = summarizeDepot(source, [task()], { checkedAt: at(0), checkedBy: "Немых Д.Д." }, true, now);
  assert.equal(checked.needsCheck, false); assert.equal(checked.idleDays, 0);
  assert.equal(checked.lastActivityAt, task().updatedAt); // Inspection does not invent task work.
  assert.equal(summarizeDepot(source, [task({ lastEventAt: at(2) })], null, true, now).idleDays, 2);
});
test("task counts exclude archive, completed tasks are not overdue, today's deadline is not overdue", () => {
  const result = summarizeDepot(source, [
    task({ id: "late", deadline: "2026-09-15T00:00:00.000Z" }),
    task({ id: "today", deadline: "2026-09-16T00:00:00.000Z" }),
    task({ id: "done", columnName: "Готово", deadline: "2026-09-10T00:00:00.000Z" }),
    task({ id: "archived", archivedAt: now.toISOString(), deadline: "2026-09-10T00:00:00.000Z" }),
  ], null, true, now);
  assert.equal(result.active, 2); assert.equal(result.completed, 1); assert.equal(result.overdue, 1);
  assert.equal(result.tasks[0].id, "late"); assert.equal(result.tasks.length, 2);
  assert.equal(result.tasks[0].href, "/board?board=team&q=17");
});
test("automatic archival does not reset an inactivity reminder", () => {
  const result = summarizeDepot(source, [task({ archivedAt: now.toISOString(), updatedAt: now.toISOString() })], null, true, now);
  assert.equal(result.needsCheck, true);
  assert.equal(result.lastActivityAt, task().createdAt);
});
