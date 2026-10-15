"use client";

import { ArrowRight, CalendarDays, Check, ChevronDown, ChevronRight, Link2, Plus, RotateCcw, Settings2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MapTask = {
  id: string; taskNumber: number; title: string; description: string; deadline: string | null; parentId: string | null;
  assigneeId: string | null; assignees?: Array<{ userId: string }>;
  column?: { name: string }; checklists?: Array<{ id: string; title: string; items: Array<{ id: string; text: string; completed: boolean }> }>;
};
type Link = { id?: string; predecessorId: string; successorId: string };
type Scale = "day" | "week" | "month";

const STORAGE_PREFIX = "taskora-map-order:";
const formatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });

function mine(task: MapTask, userId: string, personalBoard = false) {
  return personalBoard || task.assigneeId === userId || Boolean(task.assignees?.some((item) => item.userId === userId));
}

function keyFor(dateValue: string | null, scale: Scale) {
  if (!dateValue) return "unscheduled";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "unscheduled";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  if (scale === "month") return `${year}-${month}`;
  if (scale === "week") {
    const monday = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    return monday.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function bucketLabel(key: string, scale: Scale) {
  if (key === "unscheduled") return "Без срока";
  if (scale === "month") return monthFormatter.format(new Date(`${key}-01T12:00:00Z`));
  if (scale === "week") return `Неделя с ${formatter.format(new Date(`${key}T12:00:00Z`))}`;
  return formatter.format(new Date(`${key}T12:00:00Z`));
}

function gapLabel(a: string, b: string, scale: Scale) {
  const first = new Date(`${scale === "month" ? `${a}-01` : a}T12:00:00Z`);
  const second = new Date(`${scale === "month" ? `${b}-01` : b}T12:00:00Z`);
  const days = Math.round((second.getTime() - first.getTime()) / 86_400_000);
  const units = scale === "day" ? days - 1 : scale === "week" ? Math.round(days / 7) - 1 : (second.getUTCFullYear() - first.getUTCFullYear()) * 12 + second.getUTCMonth() - first.getUTCMonth() - 1;
  return units > 0 ? `+${units} ${scale === "day" ? "дн." : scale === "week" ? "нед." : "мес."}` : null;
}

function words(value: string) {
  return new Set(value.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)?.filter((word) => !["задача", "работы", "сроки", "нужно", "после", "синтетический", "пример", "проверки", "интерфейса", "является", "рабочей"].includes(word)) ?? []);
}

function suggest(tasks: MapTask[], links: Link[], userId: string, personalBoard: boolean) {
  const linked = new Set(links.map((link) => `${link.predecessorId}:${link.successorId}`));
  const proposals: Array<Link & { reason: string; conflict: boolean }> = [];
  for (const successor of tasks.filter((task) => mine(task, userId, personalBoard))) {
    const successorWords = words(`${successor.title} ${successor.description}`);
    for (const predecessor of tasks) {
      if (predecessor.id === successor.id || linked.has(`${predecessor.id}:${successor.id}`) || linked.has(`${successor.id}:${predecessor.id}`)) continue;
      const overlap = [...words(`${predecessor.title} ${predecessor.description}`)].filter((word) => successorWords.has(word));
      const titleOverlap = [...words(predecessor.title)].some((word) => words(successor.title).has(word));
      const daysApart = predecessor.deadline && successor.deadline ? Math.abs((new Date(predecessor.deadline).getTime() - new Date(successor.deadline).getTime()) / 86_400_000) : Infinity;
      const sameParent = Boolean(predecessor.parentId && predecessor.parentId === successor.parentId);
      if (!titleOverlap || (overlap.length < 2 && daysApart > 14 && !sameParent)) continue;
      const conflict = Boolean(predecessor.deadline && successor.deadline && predecessor.deadline > successor.deadline);
      if (conflict && !/после|зависит|следом|следующ/i.test(`${successor.title} ${successor.description}`)) continue;
      proposals.push({ predecessorId: predecessor.id, successorId: successor.id, reason: `Похожие темы: ${overlap.slice(0, 2).join(", ")}${daysApart <= 14 ? "; близкие сроки" : ""}${conflict ? "; сроки противоречат порядку" : ""}`, conflict });
    }
  }
  return proposals.slice(0, 8);
}

export function TaskMap({ tasks, allTasks, dependencies, currentUserId, boardId, personalBoard, onOpen, onRefresh, onCreateChild }: {
  tasks: MapTask[]; allTasks: MapTask[]; dependencies: Link[]; currentUserId: string; boardId: string; personalBoard: boolean;
  onOpen: (task: MapTask) => void; onRefresh: () => Promise<unknown> | void; onCreateChild?: (parentId: string) => void;
}) {
  const [scale, setScale] = useState<Scale>("week");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [moveDraft, setMoveDraft] = useState<{ taskId: string; date: string } | null>(null);
  const [moveReason, setMoveReason] = useState("");
  const [proposedHidden, setProposedHidden] = useState<string[]>([]);
  const [paths, setPaths] = useState<Array<{ key: string; d: string; proposed: boolean }>>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState<{ from: string; to: string } | null>(null);
  const [dragKind, setDragKind] = useState<"order" | "link" | null>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useEffect(() => {
    const key = `taskora-map-zoom:${currentUserId}:${boardId}`;
    const stored = Number(localStorage.getItem(key));
    setZoom(Number.isFinite(stored) && stored >= .5 && stored <= 2 ? stored : 1);
  }, [currentUserId, boardId]);
  const changeZoom = useCallback((next: number) => {
    setZoom(Math.max(.5, Math.min(2, Math.round(next * 10) / 10)));
  }, []);
  useEffect(() => { localStorage.setItem(`taskora-map-zoom:${currentUserId}:${boardId}`, String(zoom)); }, [zoom, currentUserId, boardId]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest(".task-map-tools")) return;
      event.preventDefault();
      changeZoom(zoom + (event.deltaY < 0 ? .1 : -.1));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [zoom, changeZoom]);

  useEffect(() => {
    try { setOrder(JSON.parse(localStorage.getItem(STORAGE_PREFIX + currentUserId + ":" + boardId) ?? "[]")); } catch { setOrder([]); }
    try { setProposedHidden(JSON.parse(localStorage.getItem(`taskora-map-dismissed:${currentUserId}:${boardId}`) ?? "[]")); } catch { setProposedHidden([]); }
  }, [currentUserId, boardId]);

  const visible = useMemo(() => {
    const ids = new Set(tasks.filter((task) => mine(task, currentUserId, personalBoard)).map((task) => task.id));
    for (const link of dependencies) {
      if (ids.has(link.predecessorId)) ids.add(link.successorId);
      if (ids.has(link.successorId)) ids.add(link.predecessorId);
    }
    for (const task of allTasks) if (ids.has(task.id) && task.parentId) ids.add(task.parentId);
    return allTasks.filter((task) => ids.has(task.id));
  }, [tasks, allTasks, dependencies, currentUserId, personalBoard]);
  const proposals = useMemo(() => suggest(visible, dependencies, currentUserId, personalBoard).filter((item) => !proposedHidden.includes(`${item.predecessorId}:${item.successorId}`)), [visible, dependencies, currentUserId, personalBoard, proposedHidden]);
  const roots = useMemo(() => visible.filter((task) => !task.parentId || !visible.some((candidate) => candidate.id === task.parentId)), [visible]);
  const buckets = useMemo(() => {
    const map = new Map<string, MapTask[]>();
    for (const task of roots) {
      const key = keyFor(task.deadline, scale);
      map.set(key, [...(map.get(key) ?? []), task]);
    }
    return [...map].sort(([a], [b]) => a === "unscheduled" ? 1 : b === "unscheduled" ? -1 : a.localeCompare(b))
      .map(([key, value]) => ({ key, tasks: value.sort((a, b) => (order.indexOf(a.id) < 0 ? 99999 : order.indexOf(a.id)) - (order.indexOf(b.id) < 0 ? 99999 : order.indexOf(b.id))) }));
  }, [roots, scale, order]);
  const bucketKeys = buckets.map((bucket) => bucket.key).join("|");
  const bucketsRef = useRef(buckets);
  bucketsRef.current = buckets;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const today = keyFor(new Date().toISOString(), scale);
      const currentBuckets = bucketsRef.current;
      const target = currentBuckets.find((bucket) => bucket.key !== "unscheduled" && bucket.key >= today) ?? [...currentBuckets].reverse().find((bucket) => bucket.key !== "unscheduled");
      const element = target ? [...canvas.querySelectorAll<HTMLElement>("[data-map-date]")].find((item) => item.dataset.mapDate === target.key) : null;
      if (element) canvas.scrollLeft = Math.max(0, element.offsetLeft - 28);
    });
    return () => cancelAnimationFrame(frame);
  }, [boardId, scale, bucketKeys]);

  const measure = useCallback(() => {
    const plane = nodesRef.current;
    if (!plane) return;
    const box = plane.getBoundingClientRect();
    const rects = new Map<string, { rect: DOMRect; bucket: string | undefined }>();
    plane.querySelectorAll<HTMLElement>("[data-map-task]").forEach((element) => rects.set(element.dataset.mapTask!, {
      rect: element.getBoundingClientRect(), bucket: element.closest<HTMLElement>("[data-map-date]")?.dataset.mapDate,
    }));
    const links = [
      ...dependencies.filter((link) => rects.has(link.predecessorId) && rects.has(link.successorId)).map((link) => ({ ...link, proposed: false })),
      ...proposals.filter((link) => rects.has(link.predecessorId) && rects.has(link.successorId)).map((link) => ({ ...link, proposed: true })),
    ];
    setViewport({ width: plane.scrollWidth, height: plane.scrollHeight });
    setPaths(links.map((link, index) => {
      const from = rects.get(link.predecessorId)!;
      const to = rects.get(link.successorId)!;
      let d: string;
      if (from.bucket === to.bucket && to.rect.left <= from.rect.left + 8) {
        const x1 = (from.rect.right - box.left) / zoom;
        const y1 = (from.rect.top + from.rect.height / 2 - box.top) / zoom;
        const x2 = (to.rect.right - box.left) / zoom;
        const y2 = (to.rect.top + to.rect.height / 2 - box.top) / zoom;
        const lane = Math.max(x1, x2) + 14 + (index % 2) * 5;
        const direction = y2 >= y1 ? 1 : -1;
        const radius = Math.min(8, Math.abs(y2 - y1) / 4, lane - x1, lane - x2);
        d = `M ${x1} ${y1} H ${lane - radius} Q ${lane} ${y1} ${lane} ${y1 + radius * direction} V ${y2 - radius * direction} Q ${lane} ${y2} ${lane - radius} ${y2} H ${x2}`;
      } else {
        const x1 = (from.rect.right - box.left) / zoom;
        const y1 = (from.rect.top + from.rect.height / 2 - box.top) / zoom;
        const x2 = (to.rect.left - box.left) / zoom;
        const y2 = (to.rect.top + to.rect.height / 2 - box.top) / zoom;
        const reach = Math.min(48, Math.max(18, Math.abs(x2 - x1) / 3));
        const direction = x2 >= x1 ? 1 : -1;
        d = `M ${x1} ${y1} C ${x1 + reach * direction} ${y1}, ${x2 - reach * direction} ${y2}, ${x2} ${y2}`;
      }
      return { key: `${link.predecessorId}:${link.successorId}:${link.proposed}`, d, proposed: link.proposed };
    }));
  }, [dependencies, proposals, zoom]);
  useEffect(() => {
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    if (nodesRef.current) observer.observe(nodesRef.current);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure, expanded, detailId, scale, visible, order, zoom]);

  useEffect(() => {
    if (!moveDraft) return;
    const frame = requestAnimationFrame(() => {
      const card = [...(nodesRef.current?.querySelectorAll<HTMLElement>("[data-map-task]") ?? [])].find((element) => element.dataset.mapTask === moveDraft.taskId);
      const input = card?.parentElement?.querySelector<HTMLInputElement>(".task-map-deadline-form input[type='date']");
      if (!input) return;
      input.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest", inline: "nearest" });
      input.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [moveDraft]);

  async function command(payload: object) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/task-map", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Не удалось изменить карту");
      await onRefresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось изменить карту"); }
    finally { setBusy(false); }
  }

  function reorder(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const next = [...new Set([...order, ...roots.map((task) => task.id)])];
    const sourceIndex = next.indexOf(sourceId);
    const targetIndex = next.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    next.splice(sourceIndex, 1);
    next.splice(next.indexOf(targetId), 0, sourceId);
    setOrder(next);
    localStorage.setItem(STORAGE_PREFIX + currentUserId + ":" + boardId, JSON.stringify(next));
  }

  async function saveDeadline(taskId: string, date: string, reason: string) {
    if (!date || !reason.trim()) { setError("Укажите новую дату и причину переноса"); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ deadline: date, deadlineChangeReason: reason.trim() }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Не удалось перенести срок");
      setMoveDraft(null); setMoveReason("");
      await onRefresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось перенести срок"); }
    finally { setBusy(false); }
  }

  function renderTask(task: MapTask, child = false): React.ReactNode {
    const own = mine(task, currentUserId, personalBoard);
    const children = visible.filter((candidate) => candidate.parentId === task.id);
    const open = expanded.includes(task.id);
    const detail = detailId === task.id;
    const items = task.checklists?.flatMap((list) => list.items) ?? [];
    const done = items.filter((item) => item.completed).length;
    const sameDateDependency = !child && dependencies.some((link) => link.successorId === task.id && visible.some((candidate) => candidate.id === link.predecessorId && keyFor(candidate.deadline, scale) === keyFor(task.deadline, scale)));
    const bucketTasks = buckets.find((bucket) => bucket.key === keyFor(task.deadline, scale))?.tasks ?? [];
    const ownPosition = bucketTasks.filter((candidate) => mine(candidate, currentUserId, personalBoard)).findIndex((candidate) => candidate.id === task.id);
    const ownBucketTasks = bucketTasks.filter((candidate) => mine(candidate, currentUserId, personalBoard));
    return <div className={`task-map-branch ${child ? "is-child" : ""} ${sameDateDependency ? "is-same-date-dependent" : ""}`} key={task.id}>
      <article className={`task-map-card ${own ? "is-own" : "is-context"} ${detail ? "is-selected" : ""}`} data-map-task={task.id}
        draggable={own && !child}
        onDragStart={(event) => { if (event.target instanceof Element && event.target.closest(".task-map-link-handle")) return; setDragKind("order"); event.dataTransfer.setData("text/plain", `order:${task.id}`); event.dataTransfer.effectAllowed = "move"; }}
        onDragEnd={() => setDragKind(null)}
        onDragOver={(event) => { if (event.dataTransfer.types.includes("text/plain")) event.preventDefault(); }}
        onDrop={(event) => {
          const payload = event.dataTransfer.getData("text/plain");
          if (payload.startsWith("link:")) { const predecessorId = payload.slice(5); event.preventDefault(); event.stopPropagation(); setDragKind(null); if (predecessorId !== task.id && !dependencies.some((link) => link.predecessorId === predecessorId && link.successorId === task.id) && own) setLinkDraft({ from: predecessorId, to: task.id }); return; }
          if (!own || child) return;
          event.preventDefault(); event.stopPropagation(); setDragKind(null);
          const source = payload.startsWith("order:") ? payload.slice(6) : "";
          if (source && keyFor(allTasks.find((item) => item.id === source)?.deadline ?? null, scale) === keyFor(task.deadline, scale)) reorder(source, task.id);
        }}>
        <span className="task-map-card-top"><span>#{task.taskNumber} · {task.column?.name ?? "Задача"}</span><span>{own ? "Моя задача" : "Не моя"}</span></span>
        {own ? <span className="task-map-link-handle" draggable title="Потяните к задаче, которая зависит от этой" aria-label={`Создать зависимость от задачи ${task.title}`} onDragStart={(event) => { event.stopPropagation(); setDragKind("link"); event.dataTransfer.setData("text/plain", `link:${task.id}`); event.dataTransfer.effectAllowed = "link"; }} onDragEnd={() => setDragKind(null)}><Link2 size={15} /></span> : null}
        <button type="button" className="task-map-title" onClick={() => { setDetailId(detail ? null : task.id); requestAnimationFrame(measure); }} aria-expanded={detail}>{task.title}<ChevronRight size={16} aria-hidden="true" /></button>
        <span className="task-map-meta"><CalendarDays size={14} aria-hidden="true" />{task.deadline ? formatter.format(new Date(task.deadline)) : "Без срока"}{items.length ? <span>{done}/{items.length} пунктов</span> : null}</span>
        {own && !child && detail && ownBucketTasks.length > 1 ? <div className="task-map-order-controls"><button type="button" disabled={ownPosition <= 0} onClick={() => reorder(task.id, ownBucketTasks[ownPosition - 1].id)} aria-label={`Поднять задачу ${task.title}`}>↑</button><button type="button" disabled={ownPosition < 0 || ownPosition >= ownBucketTasks.length - 1} onClick={() => reorder(task.id, ownBucketTasks[ownPosition + 1].id)} aria-label={`Опустить задачу ${task.title}`}>↓</button></div> : null}
        {children.length ? <button type="button" className="task-map-expand" onClick={() => setExpanded((current) => open ? current.filter((id) => id !== task.id) : [...current, task.id])} aria-expanded={open}>{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}{children.filter((item) => /готово|заверш|выполн/i.test(item.column?.name ?? "")).length}/{children.length} подзадач</button> : null}
      </article>
      {detail ? <div className="task-map-detail" aria-label={`Детали задачи ${task.title}`}>
        <p>{task.description || "Описание пока не добавлено"}</p>
        {items.length ? <ul>{items.map((item) => <li key={item.id}><Check size={14} className={item.completed ? "is-done" : ""} aria-hidden="true" />{item.text}</li>)}</ul> : <span className="task-map-muted">Чек-лист пуст</span>}
        {own ? <button type="button" onClick={() => onOpen(task)}>Открыть задачу <ArrowRight size={14} /></button> : null}
        {own ? <form className="task-map-deadline-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void saveDeadline(task.id, String(data.get("deadline") ?? ""), String(data.get("reason") ?? "")); }}>
          <strong>Перенести срок</strong><label htmlFor={`map-deadline-${task.id}`}>Новая дата</label><input id={`map-deadline-${task.id}`} name="deadline" type="date" required defaultValue={moveDraft?.taskId === task.id ? moveDraft.date : task.deadline?.slice(0, 10) ?? ""} key={`${task.id}:${moveDraft?.date ?? ""}`} />
          <label htmlFor={`map-reason-${task.id}`}>Причина</label><input id={`map-reason-${task.id}`} name="reason" required value={moveReason} onChange={(event) => setMoveReason(event.target.value)} placeholder="Почему меняется срок" />
          <button type="submit" disabled={busy}>Сохранить дату</button>
        </form> : null}
        {dependencies.filter((link) => link.successorId === task.id).length ? <div className="task-map-dependency-list"><strong>Подтверждённые связи</strong>{dependencies.filter((link) => link.successorId === task.id).map((link) => { const before = allTasks.find((candidate) => candidate.id === link.predecessorId); return <span key={link.id ?? link.predecessorId}><Link2 size={13} /> После #{before?.taskNumber ?? "?"} {before?.title ?? "Задача"}{own ? <button type="button" disabled={busy} onClick={() => void command({ action: "disconnect", predecessorId: link.predecessorId, successorId: task.id })} aria-label="Удалить зависимость">×</button> : null}</span>; })}</div> : null}
        {own ? <div className="task-map-dependency-control"><label htmlFor={`dependency-${task.id}`}>Зависит от</label><select id={`dependency-${task.id}`} defaultValue="" onChange={(event) => { if (event.target.value) void command({ action: "connect", predecessorId: event.target.value, successorId: task.id }); event.target.value = ""; }} disabled={busy}><option value="">Выбрать задачу…</option>{visible.filter((candidate) => candidate.id !== task.id && !dependencies.some((link) => link.predecessorId === candidate.id && link.successorId === task.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>#{candidate.taskNumber} {candidate.title}</option>)}</select></div> : null}
        {own && !task.parentId && onCreateChild ? <div className="task-map-dependency-control"><button type="button" className="task-map-inline-add" onClick={() => onCreateChild(task.id)}><Plus size={14} /> Создать подзадачу</button><label htmlFor={`parent-${task.id}`}>Или добавить существующую</label><select id={`parent-${task.id}`} defaultValue="" onChange={(event) => { if (event.target.value) void command({ action: "parent", taskId: event.target.value, parentId: task.id }); event.target.value = ""; }} disabled={busy}><option value="">Выбрать задачу…</option>{visible.filter((candidate) => candidate.id !== task.id && !candidate.parentId && mine(candidate, currentUserId, personalBoard) && !visible.some((item) => item.parentId === candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>#{candidate.taskNumber} {candidate.title}</option>)}</select></div> : null}
        {own && task.parentId ? <button type="button" className="task-map-detach" disabled={busy} onClick={() => void command({ action: "parent", taskId: task.id, parentId: null })}>Убрать из большой задачи</button> : null}
      </div> : null}
      {open ? <div className="task-map-children">{children.map((item) => renderTask(item, true))}{own && onCreateChild ? <button className="task-map-add-child" type="button" onClick={() => onCreateChild(task.id)}><Plus size={15} /> Подзадача</button> : null}</div> : null}
    </div>;
  }

  return <section className="task-map" aria-label="Карта задач">
    <header className="task-map-header"><h2>Карта задач</h2><span>Потяните карточку для порядка, связь — за значок <Link2 size={13} aria-hidden="true" /></span></header>
    {error ? <p className="task-map-error" role="alert">{error}</p> : null}
    <div className="task-map-tools"><button type="button" className="task-map-tools-toggle" onClick={() => setToolsOpen(!toolsOpen)} aria-expanded={toolsOpen} aria-label={toolsOpen ? "Скрыть настройки карты" : "Показать настройки карты"}><Settings2 size={17} /> <span>Вид</span>{proposals.length ? <b>{proposals.length}</b> : null}</button>{toolsOpen ? <div className="task-map-tools-panel"><div className="task-map-controls" aria-label="Масштаб времени">{(["day", "week", "month"] as Scale[]).map((item) => <button key={item} type="button" aria-pressed={scale === item} onClick={() => setScale(item)}>{item === "day" ? "Дни" : item === "week" ? "Недели" : "Месяцы"}</button>)}</div><div className="task-map-legend"><span><i className="solid" /> Связь</span><span><i className="dashed" /> Предложение</span><span><i className="context" /> Чужая задача</span></div>{proposals.length ? <div className="task-map-suggestions"><strong>Возможные зависимости</strong>{proposals.slice(0, 3).map((item) => { const before = visible.find((task) => task.id === item.predecessorId)!; const after = visible.find((task) => task.id === item.successorId)!; return <div key={`${before.id}:${after.id}`} className="task-map-suggestion"><span>#{before.taskNumber} → #{after.taskNumber}<small>{item.reason}</small></span><button type="button" disabled={busy} onClick={() => void command({ action: "connect", predecessorId: before.id, successorId: after.id })}>Принять</button><button type="button" onClick={() => { const next = [...proposedHidden, `${before.id}:${after.id}`]; setProposedHidden(next); localStorage.setItem(`taskora-map-dismissed:${currentUserId}:${boardId}`, JSON.stringify(next)); }} aria-label="Отклонить предложение">×</button></div>; })}</div> : null}</div> : null}</div>
    {linkDraft ? <div className="task-map-link-confirm" role="dialog" aria-label="Подтвердить зависимость"><span>#{allTasks.find((task) => task.id === linkDraft.from)?.taskNumber} → #{allTasks.find((task) => task.id === linkDraft.to)?.taskNumber}<small>Вторая задача зависит от первой</small></span><button type="button" disabled={busy} onClick={() => { void command({ action: "connect", predecessorId: linkDraft.from, successorId: linkDraft.to }); setLinkDraft(null); }}>Создать связь</button><button type="button" onClick={() => setLinkDraft(null)}>Отмена</button></div> : null}
    <div className={`task-map-scroll ${dragKind === "link" ? "is-linking" : ""}`} ref={canvasRef} tabIndex={0} aria-label="Карта задач: колесо меняет масштаб, пустое место перемещает карту" onPointerDown={(event) => { if (event.button !== 0 || !(event.target instanceof Element) || event.target.closest(".task-map-card,button,input,select,.task-map-detail")) return; const canvas = canvasRef.current; if (!canvas) return; panRef.current = { x: event.clientX, y: event.clientY, left: canvas.scrollLeft, top: canvas.scrollTop }; canvas.setPointerCapture(event.pointerId); canvas.classList.add("is-panning"); }} onPointerMove={(event) => { const pan = panRef.current; const canvas = canvasRef.current; if (!pan || !canvas) return; canvas.scrollLeft = pan.left - (event.clientX - pan.x); canvas.scrollTop = pan.top - (event.clientY - pan.y); }} onPointerUp={() => { panRef.current = null; canvasRef.current?.classList.remove("is-panning"); }} onPointerCancel={() => { panRef.current = null; canvasRef.current?.classList.remove("is-panning"); }}><div className="task-map-plane" ref={nodesRef} style={{ zoom }}>
      <svg className="task-map-links" aria-hidden="true" width={viewport.width} height={viewport.height}><defs><marker id="task-map-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" /></marker></defs>{paths.map((path) => <path key={path.key} d={path.d} className={path.proposed ? "is-proposed" : ""} markerEnd="url(#task-map-arrow)" />)}</svg>
      {buckets.length ? buckets.map((bucket, index) => <div className="task-map-bucket" key={bucket.key} data-map-date={bucket.key} onDragOver={(event) => { if (event.dataTransfer.types.includes("text/plain")) event.preventDefault(); }} onDrop={(event) => {
        const payload = event.dataTransfer.getData("text/plain"); if (!payload.startsWith("order:")) return;
        event.preventDefault(); setDragKind(null); const id = payload.slice(6); const task = allTasks.find((item) => item.id === id);
        if (!task || !mine(task, currentUserId, personalBoard) || bucket.key === "unscheduled" || keyFor(task.deadline, scale) === bucket.key) return;
        const suggestedDate = scale === "month" ? `${bucket.key}-01` : bucket.key;
        setMoveDraft({ taskId: id, date: suggestedDate }); setMoveReason(""); setDetailId(id);
      }}>
        {index && buckets[index - 1].key !== "unscheduled" && bucket.key !== "unscheduled" && gapLabel(buckets[index - 1].key, bucket.key, scale) ? <span className="task-map-gap">{gapLabel(buckets[index - 1].key, bucket.key, scale)}</span> : null}
        <div className="task-map-date"><span>{bucketLabel(bucket.key, scale)}</span><small>{bucket.tasks.length}</small></div>
        <div className="task-map-stack">{bucket.tasks.map((task) => renderTask(task))}</div>
      </div>) : <div className="task-map-empty"><Link2 size={32} /><h3>Пока нет задач для карты</h3><p>Назначенные вам задачи появятся здесь вместе со связанными задачами коллег.</p></div>}
    </div></div>
    <footer className="task-map-footer"><button type="button" onClick={() => changeZoom(zoom - .1)} aria-label="Уменьшить масштаб"><ZoomOut size={16} /></button><output aria-label="Масштаб карты">{Math.round(zoom * 100)}%</output><button type="button" onClick={() => changeZoom(zoom + .1)} aria-label="Увеличить масштаб"><ZoomIn size={16} /></button><button type="button" onClick={() => { const canvas = canvasRef.current; if (canvas && nodesRef.current) changeZoom(Math.max(.5, Math.min(1.5, canvas.clientWidth / nodesRef.current.scrollWidth))); }} >Уместить всё</button><button type="button" onClick={() => { setExpanded([]); setDetailId(null); changeZoom(1); canvasRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" }); }}><RotateCcw size={15} /> Сбросить вид</button></footer>
  </section>;
}
