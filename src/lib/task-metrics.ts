type DateValue = string | Date;
type Log = { id?: string; action: string; createdAt: DateValue; details?: unknown; user?: { name: string } };
export type MetricsTask = { createdAt: DateValue; updatedAt?: DateValue; archivedAt?: DateValue | null; deadline?: DateValue | null; column: { name: string }; activityLogs?: Log[] };
const timestamp = (value: DateValue) => new Date(value).getTime();
const done = (name: string) => /готов|закры|done|complete/i.test(name);
const work = (name: string) => /работ|progress|doing/i.test(name);
const review = (name: string) => /провер|review|verify|approval/i.test(name);
function details(log: Log): Record<string, any> { return log.details && typeof log.details === "object" ? log.details as Record<string, any> : {}; }

export function taskMetrics(task: MetricsTask, now = new Date()) {
  const logs = [...(task.activityLogs ?? [])].sort((a,b)=>timestamp(a.createdAt)-timestamp(b.createdAt) || (a.id ?? "").localeCompare(b.id ?? ""));
  const transitions = logs.filter(log=>log.action === "STATUS_CHANGED" && details(log).column && details(log).previousColumn !== details(log).column);
  const created = logs.find(log=>log.action === "TASK_CREATED");
  const creation = created ? details(created) : {};
  const start = timestamp(task.createdAt);
  const end = Math.max(start, Math.min(now.getTime(), task.archivedAt ? timestamp(task.archivedAt) : now.getTime()));
  let cursor = start;
  let stage = transitions.length ? String(details(transitions[0]).previousColumn || creation.column || task.column.name) : String(creation.column || task.column.name);
  let closedAt: number | null = done(stage) ? (creation.column ? start : task.updatedAt ? Math.min(end,timestamp(task.updatedAt)) : null) : null;
  const stages = new Map<string, number>();
  const add = (name: string, duration: number) => stages.set(name, (stages.get(name) ?? 0) + Math.max(0,duration));
  for (const log of transitions) {
    const time = Math.max(start, timestamp(log.createdAt));
    if (!Number.isFinite(time) || time > end) continue;
    add(stage, time-cursor);
    stage = String(details(log).column);
    cursor = time;
    closedAt = done(stage) ? time : null;
  }
  add(stage,end-cursor);
  const stageRows = [...stages].map(([name, milliseconds])=>({name,milliseconds}));
  const deadlineChanges = logs.filter(log=>log.action === "DEADLINE_CHANGED").map(log=>{
    const data=details(log);
    return {id:log.id,createdAt:log.createdAt,user:log.user?.name ?? "Система",oldValue:data.oldValue ?? null,newValue:data.newValue ?? data.deadline ?? null,reason:data.reason === "returned_from_review" ? "Возврат с проверки в работу" : data.reason || "Причина не указана"};
  });
  const firstChange = deadlineChanges[0];
  const originalDeadline = creation.deadline ?? firstChange?.oldValue ?? (deadlineChanges.length ? null : task.deadline ?? null);
  return {
    stages:stageRows,
    workMs:stageRows.filter(row=>work(row.name) && !review(row.name)).reduce((sum,row)=>sum+row.milliseconds,0),
    reviewMs:stageRows.filter(row=>review(row.name)).reduce((sum,row)=>sum+row.milliseconds,0),
    leadMs:Math.max(0,(closedAt ?? end)-start),
    closedAt: closedAt ? new Date(closedAt).toISOString() : null,
    approximate: !created || (!creation.column && !(transitions[0] && details(transitions[0]).previousColumn)),
    originalDeadline,
    deadlineChanges,
    postponements:deadlineChanges.filter(change=>change.oldValue && change.newValue && timestamp(change.newValue)>timestamp(change.oldValue)).length,
  };
}

export function buildTimeReport(tasks: MetricsTask[], from: Date, to: Date, now = new Date()) {
  const completed = tasks.map(task=>taskMetrics(task,now)).filter(metric=>metric.closedAt && timestamp(metric.closedAt)>=from.getTime() && timestamp(metric.closedAt)<=to.getTime());
  const average = (key: "leadMs" | "workMs" | "reviewMs") => completed.length ? completed.reduce((sum,metric)=>sum+metric[key],0)/completed.length : null;
  const stages=new Map<string,{name:string;totalMs:number;tasks:number}>();
  for(const metric of completed) for(const stage of metric.stages) {
    if(done(stage.name)) continue;
    const row=stages.get(stage.name) ?? {name:stage.name,totalMs:0,tasks:0};
    row.totalMs+=stage.milliseconds;row.tasks++;stages.set(stage.name,row);
  }
  const rows=[...stages.values()].map(row=>({...row,averageMs:row.totalMs/row.tasks})).sort((a,b)=>b.averageMs-a.averageMs);
  return {completed:completed.length,averageLeadMs:average("leadMs"),averageWorkMs:average("workMs"),averageReviewMs:average("reviewMs"),stages:rows,approximate:completed.filter(metric=>metric.approximate).length};
}

export function formatElapsed(milliseconds: number | null | undefined) {
  if(milliseconds == null) return "—";
  const minutes=Math.floor(Math.max(0,milliseconds)/60000);
  if(minutes<1) return "< 1 мин";
  const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),rest=minutes%60;
  return [days ? `${days} д` : "",hours ? `${hours} ч` : "",!days && rest ? `${rest} мин` : ""].filter(Boolean).join(" ");
}
