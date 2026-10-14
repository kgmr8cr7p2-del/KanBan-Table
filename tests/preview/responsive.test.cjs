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

test('wide board columns fill the available workspace and depots align across owners',async()=>{
  const page=await browser.newPage();
  try {
    for(const width of [1920,2560,3840]) {
      await page.setViewportSize({width,height:1080});await page.goto(baseURL+'/board');
      await page.locator('.task-card').first().waitFor();
      const layout=await page.locator('.workspace-board').evaluate(board=>{
        const columns=[...board.children].map(column=>column.getBoundingClientRect());const rect=board.getBoundingClientRect();
        return {overflow:board.scrollWidth-board.clientWidth,widths:columns.map(rect=>rect.width),gap:rect.right-parseFloat(getComputedStyle(board).paddingRight)-columns.at(-1).right};
      });
      assert.ok(layout.overflow<=1,JSON.stringify(layout));assert.ok(Math.abs(layout.gap)<=1,JSON.stringify(layout));assert.ok(Math.max(...layout.widths)-Math.min(...layout.widths)<=1);
    }
    await page.goto(baseURL+'/oil-depots');
    const groups=await page.locator('.main section[aria-label]').evaluateAll(groups=>groups.map(group=>[...group.querySelectorAll('article')].map(card=>{const r=card.getBoundingClientRect();return {top:r.top,height:r.height};})));
    assert.equal(groups.length,3);
    for(let row=0;row<3;row++){assert.ok(Math.max(...groups.map(group=>group[row].top))-Math.min(...groups.map(group=>group[row].top))<=1);assert.ok(Math.max(...groups.map(group=>group[row].height))-Math.min(...groups.map(group=>group[row].height))<=1);}
    await page.screenshot({path:'.local/responsive/aligned-depots.png'});
  } finally {await page.close();}
});

for(const width of [390,1440]) test(`document library, upload, race-safe preview and Excel sheets ${width}`,async()=>{
  const page=await browser.newPage({viewport:{width,height:900}});
  const entry=(id,title,originalName)=>({id,title,originalName,description:'Описание документа',category:'Регламенты',size:100,mimeType:'text/plain',createdAt:'2026-10-14T09:00:00Z',uploadedBy:{name:'Тестовый пользователь'}});
  let files=[entry('first','Первый документ','first.txt'),entry('second','Второй документ','second.txt'),entry('sheets','Таблица','book.xlsx'),entry('pdf','PDF-документ','document.pdf')];
  let uploaded=null;
  await page.route('**/api/important-files**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()==='POST') {
      const data=await new Request('http://preview',{method:'POST',headers:{'content-type':request.headers()['content-type']},body:request.postDataBuffer()}).formData();
      uploaded={name:data.get('file').name,title:data.get('title'),description:data.get('description')};
      const file=entry('uploaded',uploaded.title,uploaded.name);files=[file,...files];
      await new Promise(resolve=>setTimeout(resolve,150));return route.fulfill({status:201,json:{file}});
    }
    if(url.pathname==='/api/important-files') return route.fulfill({json:{files,categories:['Регламенты']}});
    if(url.pathname.includes('/sheets/preview')) return route.fulfill({json:{preview:{type:'sheet',sheetName:'Первый',sheets:[{index:0,name:'Первый'},{index:1,name:'Второй'}],rows:[[url.searchParams.get('sheet')==='1'?'Второй лист':'Первый лист']]}}});
    if(url.pathname.includes('/pdf/preview')) return route.fulfill({json:{preview:{type:'pdf',url:'/api/important-files/pdf/content'}}});
    if(url.pathname.endsWith('/content')) return route.fulfill({contentType:'application/pdf',body:'%PDF-1.7\n%%EOF'});
    if(url.pathname.includes('/first/preview')) await new Promise(resolve=>setTimeout(resolve,200));
    return route.fulfill({json:{preview:{type:'text',text:url.pathname.includes('/first/')?'Содержимое первого':'Содержимое второго'}}});
  });
  try {
    await page.goto(baseURL+'/files');
    await page.getByRole('button',{name:/Второй документ/}).click();
    const preview=page.getByRole('region',{name:'Предпросмотр документа'});
    await preview.getByText('Содержимое второго',{exact:true}).waitFor();await page.waitForTimeout(250);
    assert.equal(await preview.getByText('Содержимое первого',{exact:true}).count(),0);
    if(width<850) await page.getByRole('button',{name:'Назад к библиотеке'}).click();
    await page.getByRole('button',{name:/Таблица/}).click();
    await page.getByRole('combobox',{name:'Лист Excel'}).selectOption('1');await page.getByText('Второй лист',{exact:true}).waitFor();
    if(width<850) await page.getByRole('button',{name:'Назад к библиотеке'}).click();
    await page.getByRole('button',{name:/PDF-документ/}).click();
    await page.locator('iframe[title="PDF: document.pdf"]').waitFor();
    await page.getByRole('button',{name:'Добавить документ',exact:true}).click();
    await page.locator('dialog[open] input[type=file]').setInputFiles({name:'regulation.txt',mimeType:'text/plain',buffer:Buffer.from('Тестовый регламент')});
    await page.locator('dialog[open] input[name=title]').fill('Новый регламент');await page.locator('dialog[open] textarea').fill('Описание загрузки');
    await page.getByRole('button',{name:'Добавить',exact:true}).click();
    await page.getByRole('heading',{name:'Новый регламент',exact:true}).waitFor();
    assert.deepEqual(uploaded,{name:'regulation.txt',title:'Новый регламент',description:'Описание загрузки'});
    await assertGeometry(page);await page.screenshot({path:`.local/responsive/documents-${width}.png`});
  } finally {await page.close();}
});

test('mascot runs, produces a projectile and sends only to the selected recipient',async()=>{
  const page=await browser.newPage({viewport:{width:1024,height:768}});let recipient=null;
  await page.route('**/api/monkey',async route=>{
    if(route.request().method()==='POST'){recipient=route.request().postDataJSON().recipientId;return route.fulfill({json:{sent:true}});}
    return route.fulfill({json:{users:[{id:'other-user',name:'Тестовый коллега'}],notices:[]}});
  });
  try {
    await page.goto(baseURL+'/board?mascot=1');
    const monkey=page.getByRole('button',{name:'Обезьяна: сделать сюрприз'});await monkey.waitFor();
    const first=await monkey.boundingBox();await page.waitForTimeout(2200);const next=await monkey.boundingBox();
    assert.ok(Math.hypot(next.x-first.x,next.y-first.y)>1,'Mascot must move');
    const image=await page.evaluate(async()=>{const img=new Image();img.src='/mascot/monkey-atlas.png';await img.decode();return {width:img.naturalWidth,height:img.naturalHeight};});assert.ok(image.width>1000&&image.height>100);
    await page.mouse.move(next.x+next.width/2,next.y+next.height/2);await monkey.click();
    await page.getByRole('button',{name:'Выбрать, в кого кинуть'}).click();
    await page.getByRole('button',{name:'Тестовый коллега',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Сюрприз отправлен'}).waitFor();assert.equal(recipient,'other-user');
    await page.screenshot({path:'.local/responsive/monkey.png'});
  } finally {await page.close();}
});

test('recipient gets a notice and supplied audio plays once across repeated polling',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const event={id:'test-prank-sound',kind:'prank',soundUrl:'/mascot/prank.mp3',createdAt:new Date().toISOString()};
  await page.addInitScript(()=>{window.__soundStarts=0;const original=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const source=original.call(this);const start=source.start.bind(source);source.start=(...args)=>{window.__soundStarts++;return start(...args);};return source;};});
  await page.route('**/api/task-sound',route=>route.fulfill({json:{events:[event]}}));
  await page.route('**/api/monkey',route=>route.fulfill({json:{users:[],notices:[{id:'notice-1',title:'Обезьяний сюрприз',body:'Тестовый отправитель кинул в вас какашку.'}]}}));
  try {
    await page.goto(baseURL+'/board?mascot=1');await page.mouse.click(8,8);
    await page.getByRole('status').filter({hasText:'Тестовый отправитель'}).waitFor();
    await page.waitForFunction(()=>window.__soundStarts===1);await page.waitForTimeout(2300);assert.equal(await page.evaluate(()=>window.__soundStarts),1);
    await assertGeometry(page);
  } finally {await page.close();}
});

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
