"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { CHECK_AFTER_DAYS, DEPOT_OWNERS, type DepotSummary } from "@/lib/oil-depot-summary";
import styles from "./OilDepotDirectory.module.css";

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Moscow" }).format(new Date(value)) : "Нет записей";
}

export function OilDepotDirectory({ depots, canCheck }: { depots: DepotSummary[]; canCheck: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [router]);

  async function checkDepot(depot: DepotSummary) {
    setPending(depot.key); setFeedback(null);
    try {
      const response = await fetch("/api/oil-depots/check", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: depot.key }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.checkedAt) throw new Error(result?.error || "Проверка не сохранена. Попробуйте ещё раз.");
      setFeedback({ text: `Проверка «${depot.name}» сохранена`, error: false });
      router.refresh();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Не удалось сохранить проверку", error: true });
    } finally { setPending(null); }
  }
  const attention = depots.filter(d => d.needsCheck).length;
  const overdue = depots.reduce((n, d) => n + d.overdue, 0);
  const needle = query.trim().toLocaleLowerCase("ru").replaceAll("ё", "е");
  const shown = depots.filter(d => (!onlyAttention || d.needsCheck || d.overdue > 0) &&
    `${d.name} ${d.owner} ${d.os} ${d.equipment}`.toLocaleLowerCase("ru").replaceAll("ё", "е").includes(needle));

  return <div className={`content insights-page ${styles.directory}`}>
    <header className={styles.heading}><h1>Нефтебазы</h1></header>
    <div className={styles.overview}>
      <div><span><strong>{depots.length}</strong> нефтебаз</span></div>
      <div><span><strong>{depots.reduce((n, d) => n + d.active, 0)}</strong> открытых задач</span></div>
      <div className={overdue ? styles.danger : undefined}><span><strong>{overdue}</strong> просрочено</span></div>
      <div className={attention ? styles.warning : undefined}><span><strong>{attention}</strong> требуют проверки</span></div>
    </div>
    {attention > 0 && <div className={styles.reminder} role="status"><p><strong>Пора проверить {attention} объектов.</strong> Нет активности более {CHECK_AFTER_DAYS} дней.</p></div>}
    <div className={styles.toolbar}>
      <label className={styles.search}><Search size={18} aria-hidden="true" /><input aria-label="Поиск нефтебазы или сотрудника" className={styles.searchInput} value={query} onChange={e => setQuery(e.target.value)} placeholder="Нефтебаза или сотрудник" /></label>
      <button type="button" className={`button ${onlyAttention ? "" : "secondary"}`} aria-pressed={onlyAttention} onClick={() => setOnlyAttention(v => !v)}>Требуют внимания</button>
      {(query || onlyAttention) && <span className="muted" role="status">Найдено: {shown.length}</span>}
    </div>
    {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? styles.danger : styles.success}>{feedback.text}</p>}
    <div className={styles.people}>
      {DEPOT_OWNERS.map((owner, index) => {
        const all = depots.filter(d => d.owner === owner);
        const rows = shown.filter(d => d.owner === owner).sort((a, b) => Number(b.needsCheck || b.overdue > 0) - Number(a.needsCheck || a.overdue > 0) || a.name.localeCompare(b.name, "ru"));
        return <section className={styles.person} key={owner} aria-label={owner}>
          <header className={styles.personHeading}><div className={`${styles.avatar} ${styles[`person${index}`]}`} aria-hidden="true">{owner.split(" ")[0].slice(0, 1)}{owner.split(" ")[1]?.slice(0, 1)}</div><div><h2>{owner}</h2><p className="muted">Нефтебаз: {all.length} · Открытых задач: {all.reduce((n, d) => n + d.active, 0)}</p></div></header>
          <div className={styles.depots}>
            {rows.length === 0 && <p className={`muted ${styles.empty}`}>Нет нефтебаз по выбранным условиям.</p>}
            {rows.map(d => <article key={d.key} className={`${styles.depot} ${d.needsCheck ? styles.needsCheck : ""}`}>
              <div className={styles.depotHeading}><h3>{d.name}</h3><span className={styles.os}>{d.os}</span></div>
              <div className={styles.metrics}><span><strong>{d.active}</strong> открыто</span><span className={d.overdue ? styles.danger : undefined}><strong>{d.overdue}</strong> просрочено</span><span><strong>{d.completed}</strong> готово</span></div>
              <div className={styles.activity}><span>Работа по задачам</span><time dateTime={d.lastActivityAt ?? undefined}>{dateLabel(d.lastActivityAt)}</time></div>
              <div className={styles.activity}><span>Последняя проверка</span><time dateTime={d.checkedAt ?? undefined}>{dateLabel(d.checkedAt)}</time></div>
              {d.checkedBy && <p className={styles.checkedBy}>Проверил: {d.checkedBy}</p>}
              {d.needsCheck ? <p className={styles.checkNotice}>{d.idleDays === null ? "Проверка ещё не зафиксирована" : `Без активности ${d.idleDays} дн.`}</p> : <p className={styles.fresh}>{d.idleDays === 0 ? "Активность сегодня" : `Активность ${d.idleDays} дн. назад`}</p>}
              {!d.matched && <p className={styles.unmatched}>Связь с нефтебазой на доске не найдена. Задачи могут быть не привязаны к объекту.</p>}
              {d.tasks.length > 0 && <details className={styles.details}><summary>Открытые задачи ({d.tasks.length})</summary><ul className={styles.taskList}>{d.tasks.map(t => <li key={t.id}><Link href={t.href}><span><small className={t.overdue ? styles.danger : "muted"}>№{t.number} · {t.overdue ? "Просрочено" : t.status}</small><span>{t.title}</span></span></Link></li>)}</ul></details>}
              <details className={styles.details}><summary>Состав АСУ ТП</summary><p>{d.equipment}</p><p className="muted">Часовой пояс: {d.timezone} (как в источнике)</p></details>
              {canCheck && <button type="button" className={`button secondary ${styles.checkButton}`} disabled={pending !== null} onClick={() => void checkDepot(d)}>{pending === d.key ? "Сохраняем…" : "Отметить проверку"}</button>}
            </article>)}
          </div>
        </section>;
      })}
    </div>
    <details className={styles.note}><summary>О данных</summary><p className="muted">Показатели общей доски без архива. Напоминания учитывают изменения задач и явные проверки. Данные обновляются каждую минуту.</p></details>
  </div>;
}
