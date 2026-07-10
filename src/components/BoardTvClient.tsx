"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, CloudSun, ExternalLink, Radio, RefreshCw, Timer, Wind } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type View = any;
type Task = any;
type Weather = any;

const priorityLabels = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
  CRITICAL: "Критический",
};

const officeWeatherLocation = {
  name: "Санкт-Петербург",
  address: "Конногвардейский бульвар, 4",
  latitude: 59.9329,
  longitude: 30.2991,
};

const weatherLabels: Record<number, string> = {
  0: "Ясно",
  1: "Преимущественно ясно",
  2: "Переменная облачность",
  3: "Пасмурно",
  45: "Туман",
  48: "Изморозь",
  51: "Легкая морось",
  53: "Морось",
  55: "Сильная морось",
  61: "Небольшой дождь",
  63: "Дождь",
  65: "Сильный дождь",
  71: "Небольшой снег",
  73: "Снег",
  75: "Сильный снег",
  80: "Кратковременный дождь",
  81: "Ливень",
  82: "Сильный ливень",
  95: "Гроза",
};

export function BoardTvClient({ initialView }: { initialView: View }) {
  const [view, setView] = useState(initialView);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [now, setNow] = useState(new Date());
  const [boardUrl, setBoardUrl] = useState("/board");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());
  const [connectionState, setConnectionState] = useState<"live" | "stale">("live");

  const tasks = useMemo(() => view?.board?.columns?.flatMap((column: any) => column.tasks) ?? [], [view]);
  const summary = useMemo(() => buildSummary(tasks, view), [tasks, view]);
  const urgentTasks = useMemo(() => buildUrgentTasks(tasks), [tasks]);
  const recentEvents = useMemo(() => (view?.activityLogs ?? []).slice(0, 6), [view]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    setBoardUrl(`${window.location.origin}/board`);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void refreshWeather();
    const timer = window.setInterval(() => void refreshWeather(), 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refreshBoard(), 15 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function refreshBoard() {
    try {
      const response = await fetch("/api/board");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Board refresh failed");
      setView(data);
      setLastUpdatedAt(new Date());
      setConnectionState("live");
    } catch {
      setConnectionState("stale");
    }
  }

  async function refreshWeather() {
    const response = await fetch("/api/weather/office");
    const data = await response.json().catch(() => null);
    if (data && !data.unavailable) {
      setWeather(data);
      return;
    }

    const direct = await fetchOfficeWeatherDirect().catch(() => data);
    if (direct) setWeather(direct);
  }

  return (
    <main className="tv-page">
      <header className="tv-hero">
        <section className="tv-title-block">
          <span className={connectionState === "live" ? "tv-live-pill" : "tv-live-pill tv-live-stale"}>
            <Radio size={16} />
            {connectionState === "live" ? "LIVE-синхронизация" : "Нет связи"}
          </span>
          <h1>Операционная доска</h1>
          <p>{view?.board?.name ?? "Team Kanban Board"} · офисный экран задач</p>
        </section>

        <section className="tv-clock-card" aria-label="Время">
          <strong>{timeOnly(now)}</strong>
          <span>{dateLong(now)}</span>
        </section>

        <WeatherPanel weather={weather} />
      </header>

      <section className="tv-kpi-grid" aria-label="Сводка по доске">
        <KpiCard title="Активно" value={summary.active} tone="blue" icon={<Timer size={22} />} />
        <KpiCard title="В работе" value={summary.inProgress} tone="violet" icon={<RefreshCw size={22} />} />
        <KpiCard title="Просрочено" value={summary.overdue} tone="red" icon={<AlertTriangle size={22} />} />
        <KpiCard title="Критические" value={summary.critical} tone="amber" icon={<CalendarClock size={22} />} />
        <KpiCard title="Готово" value={summary.completed} tone="green" icon={<CheckCircle2 size={22} />} />
      </section>

      <section className="tv-layout">
        <section className="tv-board" aria-label="Канбан-доска для телевизора">
          {view?.board?.columns?.map((column: any) => (
            <article className="tv-column" key={column.id}>
              <header>
                <span>{column.name}</span>
                <b>{column.tasks.length}</b>
              </header>
              <div className="tv-task-list">
                {column.tasks.slice(0, 5).map((task: Task) => (
                  <TvTaskCard key={task.id} task={task} />
                ))}
                {column.tasks.length > 5 ? <div className="tv-more-card">+{column.tasks.length - 5} еще</div> : null}
                {!column.tasks.length ? <div className="tv-empty-column">Нет задач</div> : null}
              </div>
            </article>
          ))}
        </section>

        <aside className="tv-side-panel" aria-label="Фокус дня">
          <section className="tv-panel-card">
            <header>
              <AlertTriangle size={18} />
              <span>Горит сейчас</span>
            </header>
            <div className="tv-focus-list">
              {urgentTasks.length ? (
                urgentTasks.map((task) => <TvFocusTask key={task.id} task={task} />)
              ) : (
                <p className="tv-muted">Критичных задач и ближайших дедлайнов нет.</p>
              )}
            </div>
          </section>

          <section className="tv-panel-card">
            <header>
              <RefreshCw size={18} />
              <span>Последние события</span>
            </header>
            <div className="tv-event-list">
              {recentEvents.map((event: any) => (
                <div className="tv-event" key={event.id}>
                  <strong>{activityLabel(event.action)}</strong>
                  <span>{event.task ? `#${event.task.taskNumber} ${event.task.title}` : "Доска"}</span>
                  <small>{timeShort(event.createdAt)}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="tv-panel-card tv-qr-card">
            <header>
              <ExternalLink size={18} />
              <span>Открыть с телефона</span>
            </header>
            <div className="tv-qr-body">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=132x132&data=${encodeURIComponent(boardUrl)}`} alt="QR-код для открытия доски" />
              <span>Сканируйте QR-код, чтобы открыть рабочую доску.</span>
            </div>
          </section>
        </aside>
      </section>

      <footer className="tv-footer">
        <span>Обновлено {timeOnly(lastUpdatedAt)}</span>
        <span>Экран: {rotationLabel(now)}</span>
        <a href="/board" title="Вернуться к рабочей доске">
          Открыть доску
          <ExternalLink size={16} />
        </a>
      </footer>
    </main>
  );
}

function WeatherPanel({ weather }: { weather: Weather | null }) {
  if (!weather) {
    return (
      <section className="tv-weather-card">
        <CloudSun size={24} />
        <div>
          <strong>Погода загружается</strong>
          <span>Санкт-Петербург · Конногвардейский бульвар, 4</span>
        </div>
      </section>
    );
  }

  return (
    <section className="tv-weather-card" aria-label="Погода в офисе">
      <CloudSun size={28} />
      <div>
        <strong>{weather.unavailable ? "Погода недоступна" : `${signed(weather.temperature)}°C · ${weather.summary}`}</strong>
        <span>
          {weather.office.name} · {weather.office.address}
        </span>
        {!weather.unavailable ? (
          <small>
            ощущается {signed(weather.apparentTemperature)}° · <Wind size={13} /> {weather.windSpeed} м/с
            {weather.nextPrecipitation ? ` · ${weather.nextPrecipitation.summary.toLowerCase()} ${hourOnly(weather.nextPrecipitation.time)}` : " · осадки не ожидаются"}
          </small>
        ) : null}
      </div>
    </section>
  );
}

function KpiCard({ title, value, tone, icon }: { title: string; value: number; tone: string; icon: ReactNode }) {
  return (
    <article className={`tv-kpi tv-kpi-${tone}`}>
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{title}</small>
      </div>
    </article>
  );
}

function TvTaskCard({ task }: { task: Task }) {
  return (
    <article className={`tv-task tv-task-${String(task.priority).toLowerCase()}`}>
      <div className="tv-task-top">
        <span>#{task.taskNumber}</span>
        <b>{priorityLabels[task.priority as keyof typeof priorityLabels]}</b>
      </div>
      <h2>{task.title}</h2>
      <div className="tv-task-meta">
        <span>{task.oilDepot?.name ?? "Без нефтебазы"}</span>
        {task.deadline ? <time>{dateShort(task.deadline)}</time> : null}
      </div>
      <div className="tv-task-bottom">
        <span>{task.assignee?.name ?? "Не назначен"}</span>
        {task.checklists?.length ? <small>{checklistProgress(task)}%</small> : null}
      </div>
    </article>
  );
}

function TvFocusTask({ task }: { task: Task }) {
  return (
    <article className="tv-focus-task">
      <strong>
        #{task.taskNumber} {task.title}
      </strong>
      <span>
        {task.oilDepot?.name ?? "Без нефтебазы"} · {task.assignee?.name ?? "Не назначен"}
      </span>
      <small>{task.deadline ? deadlineLabel(task.deadline) : priorityLabels[task.priority as keyof typeof priorityLabels]}</small>
    </article>
  );
}

function buildSummary(tasks: Task[], view: View) {
  const completedColumnIds = new Set((view?.board?.columns ?? []).filter((column: any) => isCompletedColumn(column.name)).map((column: any) => column.id));
  return {
    active: tasks.filter((task) => !completedColumnIds.has(task.columnId)).length,
    inProgress: tasks.filter((task) => isWorkColumn(task.column?.name ?? "")).length,
    overdue: tasks.filter((task) => isOverdue(task)).length,
    critical: tasks.filter((task) => task.priority === "CRITICAL").length,
    completed: tasks.filter((task) => completedColumnIds.has(task.columnId)).length,
  };
}

function buildUrgentTasks(tasks: Task[]) {
  return [...tasks]
    .filter((task) => task.priority === "CRITICAL" || isOverdue(task) || isDueSoon(task))
    .sort((a, b) => urgencyScore(b) - urgencyScore(a))
    .slice(0, 5);
}

function urgencyScore(task: Task) {
  let score = task.priority === "CRITICAL" ? 100 : task.priority === "HIGH" ? 60 : 20;
  if (isOverdue(task)) score += 80;
  if (isDueSoon(task)) score += 35;
  return score;
}

function isOverdue(task: Task) {
  return Boolean(task.deadline && new Date(task.deadline).getTime() < Date.now() && !isCompletedColumn(task.column?.name ?? ""));
}

function isDueSoon(task: Task) {
  if (!task.deadline || isOverdue(task)) return false;
  const diff = new Date(task.deadline).getTime() - Date.now();
  return diff <= 3 * 24 * 60 * 60 * 1000;
}

function isCompletedColumn(name: string) {
  const normalized = name.toLowerCase();
  return normalized.includes("готов") || normalized.includes("done") || normalized.includes("complete");
}

function isWorkColumn(name: string) {
  const normalized = name.toLowerCase();
  return normalized.includes("работ") || normalized.includes("progress") || normalized.includes("doing");
}

function checklistProgress(task: Task) {
  const items = task.checklists.flatMap((checklist: any) => checklist.items);
  if (!items.length) return 0;
  return Math.round((items.filter((item: any) => item.completed).length / items.length) * 100);
}

function deadlineLabel(value: string) {
  if (new Date(value).getTime() < Date.now()) return `Просрочено · ${dateShort(value)}`;
  return `Срок · ${dateShort(value)}`;
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    TASK_CREATED: "Создана задача",
    TITLE_CHANGED: "Изменено название",
    DESCRIPTION_CHANGED: "Изменено описание",
    STATUS_CHANGED: "Изменен статус",
    PRIORITY_CHANGED: "Изменен приоритет",
    DEADLINE_CHANGED: "Изменен срок",
    ASSIGNEE_CHANGED: "Изменен исполнитель",
    COMMENT_ADDED: "Добавлен комментарий",
    FILE_UPLOADED: "Загружен файл",
    CHECKLIST_CHANGED: "Изменен чек-лист",
    TASK_DELETED: "Задача удалена",
    COLUMN_CHANGED: "Изменена доска",
  };
  return labels[action] ?? action;
}

function timeOnly(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(value);
}

function timeShort(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function hourOnly(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function dateLong(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "long" }).format(value);
}

function dateShort(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function rotationLabel(value: Date) {
  const slot = Math.floor(value.getSeconds() / 20);
  if (slot === 0) return "общая доска";
  if (slot === 1) return "фокус дня";
  return "последние события";
}

async function fetchOfficeWeatherDirect() {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(officeWeatherLocation.latitude));
  url.searchParams.set("longitude", String(officeWeatherLocation.longitude));
  url.searchParams.set("timezone", "Europe/Moscow");
  url.searchParams.set("forecast_hours", "12");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("current", "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m");
  url.searchParams.set("hourly", "precipitation_probability,precipitation,weather_code,temperature_2m");

  const response = await fetch(url);
  if (!response.ok) throw new Error("Direct weather request failed");
  const data = await response.json();
  const precipitationProbability = data.hourly?.precipitation_probability ?? [];
  const precipitation = data.hourly?.precipitation ?? [];
  const nextPrecipitationIndex = precipitationProbability.findIndex((value: number, index: number) => value >= 45 || Number(precipitation[index] ?? 0) > 0);

  return {
    office: officeWeatherLocation,
    updatedAt: new Date().toISOString(),
    temperature: Math.round(Number(data.current?.temperature_2m ?? 0)),
    apparentTemperature: Math.round(Number(data.current?.apparent_temperature ?? 0)),
    precipitation: Number(data.current?.precipitation ?? 0),
    windSpeed: Math.round(Number(data.current?.wind_speed_10m ?? 0)),
    windGusts: Math.round(Number(data.current?.wind_gusts_10m ?? 0)),
    weatherCode: Number(data.current?.weather_code ?? 0),
    summary: weatherLabels[Number(data.current?.weather_code ?? 0)] ?? "Погода",
    nextPrecipitation:
      nextPrecipitationIndex >= 0
        ? {
            time: data.hourly.time[nextPrecipitationIndex],
            probability: precipitationProbability[nextPrecipitationIndex],
            precipitation: precipitation[nextPrecipitationIndex],
            summary: weatherLabels[Number(data.hourly.weather_code[nextPrecipitationIndex] ?? 0)] ?? "Осадки",
          }
        : null,
  };
}
