/* Isolated UI preview: real components, synthetic records, no database access.
   Run `node tests/preview/server.cjs`, then visit http://127.0.0.1:3015.
   Writes to the real application API are impossible in this harness. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const esbuild = require('esbuild');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../..');
const fixture = require('./fixture.json');
const output = path.join(root, '.local/preview');
fs.mkdirSync(output, {recursive:true});
async function build() {
  // Resolve through Node so Windows restricted shells do not require directory
  // enumeration above the checkout (esbuild's native resolver scans ancestors).
  await esbuild.build({absWorkingDir:root,entryPoints:[path.join(__dirname,'board.tsx')],tsconfigRaw:{compilerOptions:{jsx:'react-jsx'}},bundle:true,jsx:'automatic',write:false,outfile:path.join(output,'board.js'),platform:'browser',define:{'process.env.NODE_ENV':'"development"'},plugins:[{
    name:'workspace-files',setup(build){
      build.onResolve({filter:/.*/},args=>{
        let spec=args.path;
        if(spec==='next/navigation') spec=path.join(__dirname,'navigation.ts');
        if(spec==='next/link') spec=path.join(__dirname,'link.tsx');
        if(spec.startsWith('@/')) spec=path.join(root,'src',spec.slice(2));
        const from=args.importer || path.join(root,'package.json');
        let resolved;
        if(path.isAbsolute(spec)||spec.startsWith('.')) {
          const base=path.resolve(path.dirname(from),spec);
          resolved=[base,...['.tsx','.ts','.js','.json','/index.tsx','/index.ts','/index.js'].map(ext=>base+ext)].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
        } else resolved=createRequire(from).resolve(spec);
        if(!resolved) throw Error('Cannot resolve '+spec);
        return {path:resolved,namespace:'workspace'};
      });
      build.onLoad({filter:/.*/,namespace:'workspace'},args=>({contents:fs.readFileSync(args.path,'utf8'),loader:({'.tsx':'tsx','.ts':'ts','.json':'json','.css':'css'})[path.extname(args.path)]||'jsx'}));
    }
  }]}).then(result=>result.outputFiles.forEach(file=>fs.writeFileSync(file.path,file.contents)));
}
build().then(() => {
  if (process.argv.includes('--build')) return;
  http.createServer((req,res) => {
    const url = new URL(req.url, 'http://127.0.0.1:3015');
    res.setHeader('Cache-Control','no-store');
    if (url.pathname === '/api/board') {
      const view = structuredClone(fixture), p = url.searchParams;
      view.board.columns.forEach(column => column.tasks = column.tasks.filter(task =>
        (!p.get('q') || task.title.toLowerCase().includes(p.get('q').toLowerCase())) &&
        (!p.get('priority') || task.priority === p.get('priority')) &&
        (!p.get('oilDepot') || task.oilDepot?.id === p.get('oilDepot')) &&
        (!p.get('assignee') || (p.get('assignee') === 'unassigned' ? !task.assignee : task.assignee?.id === p.get('assignee')))
      ));
      res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify(view));
    }
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Content-Type','application/json');
      if(req.method !== 'GET') { res.statusCode=405; return res.end('{"error":"Preview is read-only"}'); }
      return res.end('{"notifications":[],"unreadCount":0,"unreadTotal":0,"conversations":[]}');
    }
    const files = {'/board.css':[path.join(output,'board.css'),'text/css'],'/board.js':[path.join(output,'board.js'),'text/javascript'], '/globals.css':[path.join(root,'src/app/globals.css'),'text/css'], '/redesign.css':[path.join(root,'src/app/redesign.css'),'text/css'], '/design-system.css':[path.join(root,'src/app/design-system.css'),'text/css'], '/taskora-icon-v2.png':[path.join(root,'public/taskora-icon-v2.png'),'image/png']};
    if(files[url.pathname]) { const [file,type]=files[url.pathname]; res.setHeader('Content-Type',type); return fs.createReadStream(file).pipe(res); }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<!doctype html><html lang="ru" data-interface-mode="new"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>TASKora · UI preview</title><link rel="stylesheet" href="/board.css"><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/redesign.css"><link rel="stylesheet" href="/design-system.css"></head><body><div id="root"></div><script src="/board.js"></script></body></html>');
  }).listen(3015,'127.0.0.1',()=>console.log('Preview ready: http://127.0.0.1:3015'));
});
