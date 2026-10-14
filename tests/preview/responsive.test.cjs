const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('@playwright/test');
const fs = require('node:fs');

const baseURL = 'http://127.0.0.1:3017';
const sizes = [[320,568],[390,844],[568,320],[600,700],[768,1024],[960,640],[1024,768],[1280,720],[1440,900],[1920,1080],[2560,1440],[3840,2160]];
let server, browser;
before(async () => {
  server = spawn(process.execPath, ['tests/preview/server.cjs'], {env:{...process.env,PORT:'3017'},stdio:['ignore','pipe','pipe']});
  let output = '';
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  for(let attempt=0;attempt<150;attempt++) {
    if(output.includes('Preview ready:')) break;
    if(server.exitCode !== null) throw Error(output);
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.match(output,/Preview ready:/,'Preview server did not start');
  browser = await chromium.launch();
  fs.mkdirSync('.local/responsive', {recursive:true});
});
after(async () => { await browser?.close(); server?.kill(); });

async function assertGeometry(page, selector='.main') {
  const geometry = await page.locator(selector).first().evaluate(root => ({
    pageOverflow: document.documentElement.scrollWidth-innerWidth,
    overflow: root.scrollWidth-root.clientWidth,
  }));
  assert.ok(geometry.pageOverflow <= 1, `Page overflows: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.overflow <= 1, `Surface overflows: ${JSON.stringify(geometry)}`);
}

for(const theme of ['light','dark']) for(const [width,height] of sizes) {
  test(`board, filters and editors ${width}x${height} ${theme}`, async () => {
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:width<600?2:1});
    try {
      await page.goto(`${baseURL}/board`);
      await page.evaluate(theme=>{document.documentElement.dataset.theme=theme},theme);
      await page.locator('.task-card').first().waitFor();
      await assertGeometry(page);
      if(width<=960) {
        await page.locator('.mobile-nav-more > summary').click();
        const menu=await page.locator('.mobile-nav-menu').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;});
        assert.ok(menu,'Mobile menu exceeds viewport');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.mobile-nav-more').getAttribute('open'),null);
      }
      await page.locator('.workspace-filters > summary').click();
      const filters = await page.locator('.workspace-filter-fields').evaluate(root => {
        const controls=[...root.children].map(el=>el.getBoundingClientRect());
        const r=root.getBoundingClientRect();
        return {columns:getComputedStyle(root).gridTemplateColumns.split(' ').length,overflow:root.scrollWidth-root.clientWidth,inside:r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
          overlap:controls.some((a,i)=>controls.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1))};
      });
      assert.equal(filters.columns,width<=600?1:2);
      assert.ok(filters.inside,`Filters outside viewport: ${JSON.stringify(filters)}`);
      assert.ok(filters.overflow<=1);
      assert.equal(filters.overlap,false);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.workspace-filters').getAttribute('open'),null);
      for(const label of ['Список','Таймлайн','Моя работа','Доска']) {
        await page.locator('.board-view-tabs').getByRole('button',{name:label,exact:true}).click();
        await assertGeometry(page);
      }
      await page.locator('.task-card').first().click();
      await assertGeometry(page,'.task-drawer');
      await page.locator('.task-drawer input[name=deadline]').fill('2026-12-31');
      assert.equal(await page.locator('[name=deadlineChangeReason]').count(),1);
      assert.equal(await page.locator('[name=deadlineChangeReason]').getAttribute('required'),'');
      const description = await page.locator('.edit-description').evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom));
      assert.ok(description>=28,'Description counter overlaps text');
      await page.locator('.assignee-select > summary').click();
      await page.locator('.assignee-picker-list').scrollIntoViewIfNeeded();
      await assertGeometry(page,'.task-drawer');
      await page.locator('.assignee-search input').fill('нет-такого-человека');
      assert.equal(await page.locator('.assignee-empty').count(),1);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.task-drawer').count(),1,'Closing picker must keep editor open');
      await page.keyboard.press('Escape');
      await page.locator('.create-task-button').first().click();
      await assertGeometry(page,'.task-drawer');
      await page.locator('.task-modal-v2-actions').scrollIntoViewIfNeeded();
      const actions=await page.locator('.task-modal-v2-actions').evaluate(el=>({height:el.getBoundingClientRect().height,viewport:innerHeight}));
      assert.ok(actions.height<actions.viewport*.4,'Footer consumes too much editor space');
      if([320,768,1440].includes(width)) await page.screenshot({path:`.local/responsive/create-${width}-${theme}.png`});
    } finally { await page.close(); }
  });
}

test('personal sound settings save independently and retain quiet hours', async () => {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  let saved=null;
  await page.route('**/api/notification-preferences',async route=>{
    if(route.request().method()==='PATCH') saved=route.request().postDataJSON().soundPreferences;
    await route.fulfill({json:{preferences:{soundPreferences:saved}}});
  });
  try {
    await page.goto(baseURL+'/settings');
    await page.getByRole('button',{name:'Звуки уведомлений'}).click();
    await page.getByRole('switch',{name:'Создание задач',exact:true}).uncheck();
    await page.getByRole('switch',{name:'Тихие часы · Москва'}).check();
    await page.locator('input[type=time]').first().fill('21:30');
    await page.getByRole('button',{name:'Сохранить',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Личные настройки сохранены'}).waitFor();
    assert.equal(saved.created,false);
    assert.equal(saved.completed,true);
    assert.equal(saved.quietFrom,'21:30');
    await assertGeometry(page,'.settings-dialog');
    await page.screenshot({path:'.local/responsive/personal-sounds-390.png'});
  } finally {await page.close();}
});

for(const [width,height] of [[320,568],[568,320],[768,1024],[1024,768],[1920,1080]]) {
  test(`workspace sections ${width}x${height}`, async () => {
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    try {
      for(const path of ['/oil-depots','/reports','/history','/archive','/chats','/files','/settings']) {
        await page.goto(baseURL+path);
        await page.locator('.main').waitFor();
        await page.waitForTimeout(100);
        assert.ok(await page.locator('.main').innerText(),`Empty page: ${path}`);
        await assertGeometry(page);
        if(path==='/settings') {await page.locator('.settings-choice').first().click();await assertGeometry(page,'.settings-dialog');}
        if(path==='/chats') {await page.locator('.chat-directory-item').first().click();await assertGeometry(page);}
        if(path==='/archive') {await page.locator('.archive-row-button').first().click();await assertGeometry(page,'dialog[open]');}
        if([320,1024].includes(width)) await page.screenshot({path:`.local/responsive/${path.slice(1)}-${width}.png`});
      }
      assert.deepEqual(errors,[]);
    } finally {await page.close();}
  });
}
