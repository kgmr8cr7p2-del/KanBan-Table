// Run with: node --test tests/oil-depot-dashboard.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

test('Omsk directory loads Omskaya tasks and preserves inspections on refresh', async () => {
  const root = path.resolve(__dirname, '..');
  const load = Module._load;
  const extension = require.extensions['.ts'];
  const date = new Date('2026-09-17T06:00:00Z');
  const task = (id, name, archivedAt = null) => ({
    id, taskNumber: Number(id), title: `Task ${id}`, deadline: null, archivedAt,
    createdAt: date, updatedAt: date, activityLogs: [],
    column: { name, boardId: 'default-board' },
  });
  const tasks = [task('347', 'Новые'), task('337', 'В работе'), task('329', 'Готово'), task('1', 'Новые', date)];
  const prisma = {
    oilDepot: { findMany: async query => {
      assert.deepEqual(query.select.tasks.where, { column: { board: { ownerId: null } } });
      return [{ name: 'Омская', tasks }, { name: 'Томск', tasks: [task('999', 'Новые')] }];
    } },
    oilDepotCheck: { findMany: async () => [{ depotKey: 'омск', checkedAt: date, user: { name: 'Inspector' } }] },
  };
  try {
    require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, file);
    Module._load = function (id, parent, main) {
      if (id === '@/lib/prisma') return { prisma };
      if (id.startsWith('@/')) id = path.join(root, 'src', id.slice(2));
      return load.call(this, id, parent, main);
    };
    const { getOilDepotDashboard } = require('../src/lib/oil-depot-dashboard.ts');
    const first = (await getOilDepotDashboard()).find(d => d.name === 'Омск');
    assert.equal(first.matched, true);
    assert.equal(first.active, 2);
    assert.equal(first.completed, 1);
    assert.deepEqual(first.tasks.map(t => t.number), [347, 337]);
    assert.equal(first.checkedAt, date.toISOString());
    assert.equal(first.checkedBy, 'Inspector');
    assert.equal(first.tasks[0].href, '/board?board=default-board&q=347');
    tasks.push(task('348', 'Новые'));
    const refreshed = (await getOilDepotDashboard()).find(d => d.name === 'Омск');
    assert.equal(refreshed.active, 3);
    assert.equal(refreshed.checkedAt, first.checkedAt);
  } finally {
    Module._load = load;
    if (extension) require.extensions['.ts'] = extension;
    else delete require.extensions['.ts'];
  }
});
