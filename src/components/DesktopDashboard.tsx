"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bell, CalendarClock, CheckCircle2, CircleAlert, RefreshCw, Timer } from "lucide-react";
import styles from "./DesktopDashboard.module.css";

type DesktopView = any;

function isClosed(task: any) {
  return Boolean(task.archivedAt) || /готов|закры|done|complete/i.test(task.columnName ?? "");
}

function isInProgress(task: any) {
  return /работ|progress|active/i.test(task.columnName ?? "");
}

function dateKey(value: string | Date | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "без срока";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(value));
}

function priorityLabel(value: string) {
  return ({ CRITICAL: "Критический", HIGH: "Высокий", MEDIUM: "Средний", LOW: "Низкий", PLANNED: "Плановые работы" } as Record<string, string>)[value] ?? value;
}

function checklistProgress(task: any) {
  const items = (task.checklists ?? []).flatMap((checklist: any) => checklist.items ?? []);
  if (!items.length) return null;
  return Math.round((items.filter((item: any) => item.completed).length / items.length) * 100);
}

function taskHref(task: any, boardId: string) {
  return `/board?board=${encodeURIComponent(boardId)}&q=${encodeURIComponent(String(task.taskNumber))}`;
}

function flatten(view: DesktopView) {
  return (view.board.columns ?? []).flatMap((column: any) =>
    (column.tasks ?? []).map((task: any) => ({ ...task, columnName: column.name })),
  );
}

function TaskRow({ task, boardId }: { task: any; boardId: string }) {
  const progress = checklistProgress(task);
  const assignees = task.assignees?.map((item: any) => item.user?.name).filter(Boolean).join(", ") || task.assignee?.name || "Не назначены";
  return (
    <a className={styles.task} href={taskHref(task, boardId)}>
      <div className={styles.taskMain}>
        <span className={styles.taskNumber}>#{task.taskNumber}</span>
        <strong>{task.title}</strong>
      </div>
      <div className={styles.taskMeta}>
        <span>{task.oilDepot?.name ?? "Без нефтебазы"}</span>
        <span>{assignees}</span>
        {task.deadline ? <span className={dateKey(task.deadline) < dateKey(new Date()) ? styles.overdue : ""}>{formatDate(task.deadline)}</span> : null}
      </div>
      <div className={styles.taskFoot}>
        <span className={styles.status}>{task.columnName}</span>
        <span>{priorityLabel(task.priority)}</span>
        {progress !== null ? <span>{progress}% чек-лист</span> : null}
        <ArrowUpRight size={15} aria-hidden="true" />
      </div>
    </a>
  );
}

export function DesktopDashboard({ initialView, userName }: { initialView: DesktopView; userName: string }) {
  const [view, setView] = useState(initialView);
  const [lastSync, setLastSync] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const tasks = useMemo(() => flatten(view), [view]);
  const today = dateKey(new Date());
  const soonKey = dateKey(new Date(Date.now() + 7 * 86_400_000));
  const active = tasks.filter((task: any) => !isClosed(task));
  const inProgress = active.filter(isInProgress);
  const overdue = active.filter((task: any) => task.deadline && dateKey(task.deadline) < today);
  const upcoming = active
    .filter((task: any) => task.deadline && dateKey(task.deadline) >= today && dateKey(task.deadline) <= soonKey)
    .sort((a: any, b: any) => String(a.deadline).localeCompare(String(b.deadline)))
    .slice(0, 8);
  const recent = (view.activityLogs ?? []).filter((log: any) => log.task).slice(0, 8);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const response = await fetch(`/api/board?board=${encodeURIComponent(view.board.id)}`, { cache: "no-store" });
      if (response.ok) {
        setView(await response.json());
        setLastSync(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [view.board.id, refreshing]);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>TASKORA · РАБОЧИЙ ЭКРАН</p>
          <h1>Рабочий центр</h1>
          <p className={styles.muted}>Привет, {userName}. Обновлено в {lastSync.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refresh} type="button" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={16} className={refreshing ? styles.spin : ""} /> Обновить</button>
          <a className={styles.openBoard} href="/board">Открыть доску <ArrowUpRight size={16} /></a>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Сводка">
        <div><Timer size={19} /><span><b>{inProgress.length}</b> в работе</span></div>
        <div className={overdue.length ? styles.metricAlert : ""}><CircleAlert size={19} /><span><b>{overdue.length}</b> просрочено</span></div>
        <div><CalendarClock size={19} /><span><b>{upcoming.length}</b> дедлайнов за 7 дней</span></div>
        <div><CheckCircle2 size={19} /><span><b>{active.length}</b> открытых задач</span></div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.panelKicker}>СЕЙЧАС</span><h2>В работе</h2></div><span className={styles.count}>{inProgress.length}</span></div>
          <div className={styles.list}>{inProgress.length ? inProgress.map((task: any) => <TaskRow key={task.id} task={task} boardId={view.board.id} />) : <p className={styles.empty}>Сейчас нет задач в работе.</p>}</div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.panelKicker}>БЛИЖАЙШИЕ 7 ДНЕЙ</span><h2>Дедлайны</h2></div><span className={styles.count}>{upcoming.length}</span></div>
          <div className={styles.list}>{upcoming.length ? upcoming.map((task: any) => <TaskRow key={task.id} task={task} boardId={view.board.id} />) : <p className={styles.empty}>Ближайших дедлайнов нет.</p>}</div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.panelKicker}>КОНТРОЛЬ</span><h2>События</h2></div><Bell size={19} /></div>
          <div className={styles.events}>{recent.length ? recent.map((log: any) => <a className={styles.event} key={log.id} href={taskHref(log.task, view.board.id)}><span>#{log.task.taskNumber}</span><div><strong>{log.task.title}</strong><small>{log.action} · {formatDate(log.createdAt)}</small></div></a>) : <p className={styles.empty}>Событий пока нет.</p>}</div>
        </article>
      </section>

      <section className={styles.lowerGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.panelKicker}>ТРЕБУЮТ ВНИМАНИЯ</span><h2>Просроченные</h2></div><span className={styles.count}>{overdue.length}</span></div>
          <div className={styles.list}>{overdue.slice(0, 6).map((task: any) => <TaskRow key={task.id} task={task} boardId={view.board.id} />)}{!overdue.length ? <p className={styles.empty}>Просроченных задач нет.</p> : null}</div>
        </article>
        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.panelKicker}>СИНХРОНИЗАЦИЯ</span><h2>Рабочая доска</h2></div><span className={styles.liveDot} /></div>
          <div className={styles.syncBody}>
            <div><span>Доска</span><strong>{view.board.name}</strong></div>
            <div><span>Всего задач</span><strong>{tasks.length}</strong></div>
            <div><span>Активных нефтебаз</span><strong>{new Set(active.map((task: any) => task.oilDepot?.name).filter(Boolean)).size}</strong></div>
            <div><span>Автообновление</span><strong>каждые 30 секунд</strong></div>
          </div>
        </article>
      </section>
    </main>
  );
}
