const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const file = path.resolve(__dirname, '../src/lib/task-deadline.ts');
const compiled = new Module(file, module);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, file);
const {deadlineText, deadlineTone, isOverdue, isDueSoon} = compiled.exports;
function task(offset, status = 'В работе') {
  const deadline = new Date(); deadline.setHours(12,0,0,0); deadline.setDate(deadline.getDate()+offset);
  return {deadline:deadline.toISOString(),column:{name:status}};
}
test('completed tasks never acquire overdue, today, or soon warnings', () => {
  for (const offset of [-400,-1,0,1,3]) {
    const item=task(offset,'Готово');
    assert.equal(isOverdue(item),false);
    assert.equal(isDueSoon(item),false);
    assert.equal(deadlineTone(item),'deadline-normal');
    assert.equal(deadlineText(item),new Intl.DateTimeFormat('ru-RU').format(new Date(item.deadline)));
  }
});
test('active deadlines distinguish past, today, near future and later dates', () => {
  assert.match(deadlineText(task(-1)),/^Просрочено/);
  assert.equal(deadlineText(task(0)),'Сегодня');
  assert.match(deadlineText(task(1)),/^Скоро/);
  assert.equal(isDueSoon(task(-1)),false);
  assert.equal(isDueSoon(task(0)),false);
  assert.equal(isDueSoon(task(6)),false);
});
test('review tasks keep their agreed approval state', () => {
  assert.equal(deadlineText(task(-30,'На проверке')),'На согласовании');
  assert.equal(deadlineTone(task(-30,'На проверке')),'deadline-review');
  assert.equal(isOverdue(task(-30,'На проверке')),false);
});
test('tasks without a deadline have a neutral label', () => {
  assert.equal(deadlineText({deadline:null}),'Без срока');
  assert.equal(deadlineTone({deadline:null}),'deadline-normal');
});
