import { CalendarClock, Timer } from "lucide-react";
import { taskMetrics, formatElapsed, type MetricsTask } from "@/lib/task-metrics";

function date(value: string | Date | null | undefined) { return value ? new Intl.DateTimeFormat("ru-RU",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(value)) : "Не указан"; }

export function TaskTiming({task}: {task: MetricsTask}) {
  const metric=taskMetrics(task);
  return <section className="task-timing" aria-label="Сроки и время задачи">
    <details open><summary><CalendarClock size={16}/>История сроков <span>{metric.deadlineChanges.length}</span></summary>
      <div className="deadline-summary"><span>Первоначальный срок<strong>{metric.originalDeadline ? date(metric.originalDeadline) : "Нет данных"}</strong></span><span>Текущий срок<strong>{date(task.deadline)}</strong></span><span>Переносов на более позднюю дату<strong>{metric.postponements}</strong></span></div>
      {metric.deadlineChanges.length ? <ol className="deadline-history">{[...metric.deadlineChanges].reverse().map((change,index)=><li key={change.id ?? index}><strong>{date(change.oldValue)} → {date(change.newValue)}</strong><p>{change.reason}</p><small>{change.user} · {new Intl.DateTimeFormat("ru-RU",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Moscow"}).format(new Date(change.createdAt))}</small></li>)}</ol> : <p className="muted">Срок ещё не менялся.</p>}
    </details>
    <details><summary><Timer size={16}/>Время по этапам</summary>
      <div className="deadline-summary"><span>В работе<strong>{formatElapsed(metric.workMs)}</strong></span><span>На проверке<strong>{formatElapsed(metric.reviewMs)}</strong></span><span>{metric.closedAt ? "До завершения" : "С момента создания"}<strong>{formatElapsed(metric.leadMs)}</strong></span></div>
      <dl className="stage-time-list">{metric.stages.map(stage=><div key={stage.name}><dt>{stage.name}</dt><dd>{formatElapsed(stage.milliseconds)}</dd></div>)}</dl>
      <small className="muted">Календарное время{metric.approximate ? " · Доступная история неполная, значения приблизительные" : ""}</small>
    </details>
  </section>;
}

export function TimeReport({report}: {report: ReturnType<typeof import("@/lib/task-metrics").buildTimeReport> | undefined}) {
  if(!report) return null;
  return <section className="time-report" aria-label="Показатели времени работы"><header><h2><Timer size={18}/>Время выполнения</h2><span className="muted">Задачи, завершённые за выбранный период · календарное время</span></header>
    <div className="time-report-summary"><span>Завершено задач<strong>{report.completed}</strong></span><span>В среднем до завершения<strong>{formatElapsed(report.averageLeadMs)}</strong></span><span>В среднем в работе<strong>{formatElapsed(report.averageWorkMs)}</strong></span><span>В среднем на проверке<strong>{formatElapsed(report.averageReviewMs)}</strong></span></div>
    {report.stages.length ? <div className="time-report-stages">{report.stages.map((stage,index)=><div key={stage.name}><span>{stage.name}{index===0 ? <small>Самый долгий этап</small> : null}</span><progress value={stage.averageMs} max={Math.max(1,report.stages[0].averageMs)} aria-label={`Среднее время: ${stage.name}`}/><strong>{formatElapsed(stage.averageMs)}</strong><small>{stage.tasks} задач</small></div>)}</div> : <p className="muted">За выбранный период завершённых задач нет.</p>}
    {report.approximate ? <small className="muted">Неполная история у {report.approximate} задач: их время рассчитано приблизительно.</small> : null}
  </section>;
}
