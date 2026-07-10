import { CheckCircle2, CheckSquare, ClipboardList, Clock3, Layers3, PieChart, TrendingUp } from "lucide-react";
import type { CSSProperties } from "react";
import { ReportLineChart } from "@/components/ReportLineChart";

export function ReportsPanel({ reports }: { reports: any }) {
  const statusCount = Math.max(1, reports?.byOilDepotStatus?.columns?.length ?? 1);
  const rows = reports?.byOilDepotStatus?.rows ?? [];
  const statusColumns = reports?.byOilDepotStatus?.columns ?? [];
  const statusTotals = statusColumns.map((column: string, index: number) => ({
    name: column,
    count: rows.reduce((sum: number, row: any) => sum + (row.statuses[index]?.count ?? 0), 0),
  }));
  const depotTotal = Math.max(1, rows.reduce((sum: number, row: any) => sum + row.total, 0));
  const topDepots = [...rows].sort((a: any, b: any) => b.total - a.total || a.name.localeCompare(b.name, "ru")).slice(0, 6);
  const closedByDepot = reports?.period?.closedByOilDepot ?? [];
  const chartData = reports?.chart ?? reports?.monthly ?? [];
  const summaryCards = [
    {
      title: "Создано задач",
      value: reports?.summary?.created ?? 0,
      note: `${reports?.year?.created ?? 0} за ${reports?.selected?.year ?? "год"}`,
      icon: ClipboardList,
      tone: "purple",
      metric: "created",
    },
    {
      title: "Закрыто задач",
      value: reports?.summary?.completed ?? 0,
      note: `${reports?.summary?.completionRate ?? 0}% закрытия`,
      icon: CheckCircle2,
      tone: "green",
      metric: "completed",
    },
    {
      title: "Просрочено задач",
      value: reports?.summary?.overdue ?? 0,
      note: (reports?.summary?.overdue ?? 0) ? "Нужно проверить сроки" : "Просроченных задач нет",
      icon: Clock3,
      tone: "red",
      metric: "overdue",
    },
    {
      title: "В работе",
      value: reports?.summary?.inProgress ?? 0,
      note: `${reports?.summary?.active ?? 0} активных задач`,
      icon: PieChart,
      tone: "orange",
      metric: "created",
    },
    {
      title: "Всего задач",
      value: reports?.summary?.total ?? 0,
      note: `Активных: ${reports?.summary?.active ?? 0}`,
      icon: Layers3,
      tone: "blue",
      metric: "created",
    },
  ];

  return (
    <section className="reports-panel reports-page-grid reports-dashboard" aria-label="Отчеты">
      <div className="report-kpi-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className={`report-kpi report-kpi-${card.tone}`} key={card.title}>
              <span className="report-kpi-icon">
                <Icon size={24} />
              </span>
              <span className="report-kpi-body">
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <small>{card.note}</small>
              </span>
              <MiniSparkline data={chartData} metric={card.metric} />
            </article>
          );
        })}
      </div>

      <article className="report-card report-chart-card">
        <div className="report-title">
          <TrendingUp size={16} />
          <h2>Динамика задач за период</h2>
        </div>
        <div className="report-legend">
          <span className="legend-created">Создано</span>
          <span className="legend-completed">Закрыто</span>
          <span className="legend-overdue">Просрочено</span>
        </div>
        <ReportLineChart data={chartData} />
      </article>

      <article className="report-card report-donut-card">
        <div className="report-title">
          <PieChart size={16} />
          <h2>Топ нефтебаз по количеству задач</h2>
        </div>
        <div className="report-donut-wrap">
          <DepotDonut rows={topDepots} total={depotTotal} />
          <div className="report-donut-list">
            {topDepots.length ? (
              topDepots.map((row: any, index: number) => (
                <div className="report-donut-row" key={row.name}>
                  <span className="donut-dot" style={{ "--dot-color": chartColors[index % chartColors.length] } as CSSProperties} />
                  <span>{row.name}</span>
                  <strong>{row.total}</strong>
                  <small>{Math.round((row.total / depotTotal) * 1000) / 10}%</small>
                </div>
              ))
            ) : (
              <p className="muted">Активных задач сейчас нет.</p>
            )}
          </div>
        </div>
      </article>

      <article className="report-card report-card-wide">
        <div className="report-title">
          <CheckSquare size={16} />
          <h2>Текущие задачи по нефтебазам</h2>
        </div>
        <div className="report-status-table">
          <div className="report-status-row report-status-head" style={{ "--status-count": statusCount } as CSSProperties}>
            <span>Нефтебаза</span>
            {statusColumns.map((column: string) => (
              <span key={column}>{column}</span>
            ))}
            <span>Всего</span>
          </div>
          {rows.length ? (
            <>
              {rows.map((row: any) => (
                <div className="report-status-row" key={row.name} style={{ "--status-count": statusCount } as CSSProperties}>
                  <strong>{row.name}</strong>
                  {row.statuses.map((status: any) => (
                    <span key={status.name}>{status.count}</span>
                  ))}
                  <b>{row.total}</b>
                </div>
              ))}
              <div className="report-status-row report-status-total" style={{ "--status-count": statusCount } as CSSProperties}>
                <strong>Итого</strong>
                {statusTotals.map((status: any) => (
                  <b key={status.name}>{status.count}</b>
                ))}
                <b>{rows.reduce((sum: number, row: any) => sum + row.total, 0)}</b>
              </div>
            </>
          ) : (
            <p className="muted history-empty">Активных задач сейчас нет.</p>
          )}
        </div>
      </article>

      <article className="report-card report-card-wide report-closed-summary">
        <div className="report-title">
          <CheckCircle2 size={16} />
          <h2>Закрыто по нефтебазам за выбранный период</h2>
        </div>
        <div className="report-closed-grid">
          {closedByDepot.length ? (
            closedByDepot.map((item: any) => (
              <span key={item.name}>
                <strong>{item.count}</strong>
                {item.name}
              </span>
            ))
          ) : (
            <span>
              <strong>0</strong>
              Закрытых задач за выбранный период нет
            </span>
          )}
        </div>
      </article>
    </section>
  );
}

const chartColors = ["#2563eb", "#16a34a", "#d97706", "#0f766e", "#64748b", "#dc2626"];

function MiniSparkline({ data, metric }: { data: any[]; metric: string }) {
  const points = buildChartPoints(data, metric, 100, 36);
  return (
    <svg className="mini-sparkline" viewBox="0 0 100 36" role="presentation" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DepotDonut({ rows, total }: { rows: any[]; total: number }) {
  let cursor = 0;
  const gradient = rows.length
    ? `conic-gradient(${rows
        .map((row, index) => {
          const start = cursor;
          cursor += (row.total / total) * 100;
          return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`;
        })
        .join(", ")})`
    : "conic-gradient(#e5e7eb 0 100%)";

  return (
    <div className="report-donut" style={{ "--donut": gradient } as CSSProperties}>
      <span>{rows.length ? `${Math.round((rows[0].total / total) * 1000) / 10}%` : "0%"}</span>
    </div>
  );
}

function buildChartPoints(data: any[], metric: string, width: number, height: number) {
  return pointsToString(buildChartCoordinates(data, metric, width, height));
}

function buildChartCoordinates(data: any[], metric: string, width: number, height: number) {
  if (!data.length) return [
    { x: 0, y: height },
    { x: width, y: height },
  ];
  const max = Math.max(1, ...data.flatMap((item) => [item.created ?? 0, item.completed ?? 0, item.overdue ?? 0]));
  return data
    .map((item, index) => {
      const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const value = item[metric] ?? 0;
      const y = height - (value / max) * (height - 8) + 2;
      return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
    });
}

function pointsToString(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function GlobalHistory({ logs }: { logs: any[] }) {
  return (
    <section className="history-panel history-page-panel" aria-label="Общая история действий">
      <div className="timeline-head">
        <span className="timeline-icon">
          <CheckSquare size={16} />
        </span>
        <div>
          <h2>Журнал изменений</h2>
          <p className="muted">Действия по задачам, файлам, комментариям и настройкам доски</p>
        </div>
      </div>
      <div className="history-table" role="table" aria-label="История действий">
        <div className="history-row history-row-head" role="row">
          <span>Дата</span>
          <span>Действие</span>
          <span>Задача</span>
          <span>Нефтебаза</span>
          <span>Пользователь</span>
        </div>
        {logs?.length ? (
          logs.map((log) => (
            <div className="history-row" role="row" key={log.id}>
              <span className="history-meta">{dateTime(log.createdAt)}</span>
              <span className="history-action">{activityLabel(log)}</span>
              <span className="history-task">{historyTaskLabel(log)}</span>
              <span>{historyOilDepotLabel(log)}</span>
              <span className="history-meta">{log.user?.name ?? "Система"}</span>
            </div>
          ))
        ) : (
          <p className="muted history-empty">За выбранный период событий нет.</p>
        )}
      </div>
    </section>
  );
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function activityLabel(log: any) {
  if (log.action === "TASK_DELETED" && log.details?.archived) return "Задача отправлена в архив";
  if (log.action === "TASK_DELETED" && log.details?.deletedPermanently) return "Задача удалена";

  const labels: Record<string, string> = {
    TASK_CREATED: "Создание задачи",
    TITLE_CHANGED: "Название изменено",
    DESCRIPTION_CHANGED: "Описание изменено",
    STATUS_CHANGED: "Статус изменен",
    PRIORITY_CHANGED: "Приоритет изменен",
    DEADLINE_CHANGED: "Срок изменен",
    ASSIGNEE_CHANGED: "Исполнитель изменен",
    COMMENT_ADDED: "Комментарий добавлен",
    FILE_UPLOADED: "Файл загружен",
    CHECKLIST_CHANGED: "Чеклист изменен",
    TASK_DELETED: "Задача удалена",
    COLUMN_CHANGED: "Настройки доски изменены",
  };
  return labels[log.action] ?? log.action;
}

function historyTaskLabel(log: any) {
  if (log.task) return `#${log.task.taskNumber} ${log.task.title}`;
  if (log.action === "TASK_DELETED" && log.details?.taskNumber && log.details?.title) {
    return `#${log.details.taskNumber} ${log.details.title}`;
  }
  return "Доска";
}

function historyOilDepotLabel(log: any) {
  return log.task?.oilDepot?.name ?? log.details?.oilDepotName ?? "Без нефтебазы";
}
