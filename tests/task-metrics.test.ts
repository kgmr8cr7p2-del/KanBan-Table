import test from "node:test";
import assert from "node:assert/strict";
import { buildTimeReport, taskMetrics } from "../src/lib/task-metrics";
import { defaultSoundPreferences, isQuietTime, shouldPlaySound, soundPreferenceSchema } from "../src/lib/sound-preferences";

const day = (value: number) => new Date(Date.UTC(2026,9,value));
const log = (dayNumber: number, previousColumn: string, column: string) => ({action:"STATUS_CHANGED",createdAt:day(dayNumber),details:{previousColumn,column}});
const creation = {action:"TASK_CREATED",createdAt:day(1),details:{column:"Новые",deadline:day(8).toISOString()}};
const task = {createdAt:day(1),updatedAt:day(10),column:{name:"Готово"},activityLogs:[creation,log(2,"Новые","В работе"),log(5,"В работе","На проверке"),log(7,"На проверке","В работе"),log(8,"В работе","Готово") ]};
const DAY=86400000;

test("stage time adds repeated visits and ignores same-column reorder events",()=>{
  const result=taskMetrics({...task,activityLogs:[...task.activityLogs,log(3,"В работе","В работе")]},day(10));
  assert.equal(result.workMs,4*DAY);
  assert.equal(result.reviewMs,2*DAY);
  assert.equal(result.leadMs,7*DAY);
  assert.equal(result.closedAt,day(8).toISOString());
});
test("reopening removes completion and resumes active time",()=>{
  const result=taskMetrics({...task,column:{name:"В работе"},activityLogs:[...task.activityLogs,log(9,"Готово","В работе")]},day(11));
  assert.equal(result.closedAt,null);
  assert.equal(result.workMs,6*DAY);
});
test("archival freezes durations without changing completion date",()=>{
  const result=taskMetrics({...task,archivedAt:day(10)},day(25));
  assert.equal(result.stages.find(stage=>stage.name==="Готово")?.milliseconds,2*DAY);
  assert.equal(result.closedAt,day(8).toISOString());
});
test("time reports use completion dates including archives and period boundaries",()=>{
  const result=buildTimeReport([{...task,archivedAt:day(20)}],day(8),day(8),day(25));
  assert.equal(result.completed,1);
  assert.equal(result.averageWorkMs,4*DAY);
  assert.equal(buildTimeReport([task],day(9),day(30),day(25)).completed,0);
});
test("deadline history preserves original date, actor, reason and later-only postponement count",()=>{
  const result=taskMetrics({...task,deadline:day(9),activityLogs:[...task.activityLogs,
    {action:"DEADLINE_CHANGED",createdAt:day(3),user:{name:"Пользователь"},details:{oldValue:day(8).toISOString(),newValue:day(10).toISOString(),reason:"Ожидаем доступ"}},
    {action:"DEADLINE_CHANGED",createdAt:day(4),details:{oldValue:day(10).toISOString(),newValue:day(9).toISOString(),reason:"Согласовано раньше"}},
  ]},day(10));
  assert.equal(result.originalDeadline,day(8).toISOString());
  assert.equal(result.postponements,1);
  assert.equal(result.deadlineChanges[0].user,"Пользователь");
  assert.equal(result.deadlineChanges[0].reason,"Ожидаем доступ");
});
test("legacy tasks explicitly mark incomplete history",()=>{
  assert.equal(taskMetrics({...task,activityLogs:[]},day(10)).approximate,true);
});
test("quiet hours handle overnight, daytime and exact boundaries in Moscow time",()=>{
  const prefs={...defaultSoundPreferences,quietEnabled:true};
  assert.equal(isQuietTime(prefs,new Date("2026-10-14T19:00:00Z")),true);
  assert.equal(isQuietTime(prefs,new Date("2026-10-14T05:00:00Z")),false);
  assert.equal(isQuietTime({...prefs,quietFrom:"09:00",quietTo:"18:00"},new Date("2026-10-14T12:00:00Z")),true);
  assert.equal(isQuietTime({...prefs,quietFrom:"09:00",quietTo:"09:00"},new Date("2026-10-14T12:00:00Z")),false);
});
test("personal sound gates respect master, category, volume and quiet hours",()=>{
  assert.equal(shouldPlaySound({...defaultSoundPreferences,created:false},"created"),false);
  assert.equal(shouldPlaySound({...defaultSoundPreferences,enabled:false},"chat"),false);
  assert.equal(shouldPlaySound({...defaultSoundPreferences,volume:0},"completed"),false);
  assert.equal(shouldPlaySound(defaultSoundPreferences,"reminder"),true);
  assert.equal(soundPreferenceSchema.safeParse({...defaultSoundPreferences,volume:2}).success,false);
  assert.equal(soundPreferenceSchema.safeParse({...defaultSoundPreferences,quietFrom:"25:99"}).success,false);
});
