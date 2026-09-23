import { createRoot } from "react-dom/client";
import { OilDepotDirectory } from "../../src/components/OilDepotDirectory";
import { DEPOT_OWNERS, type DepotSummary } from "../../src/lib/oil-depot-summary";
import { BoardClient } from "../../src/components/BoardClient";
import { WorkspaceBrand } from "../../src/components/WorkspaceBrand";
import { AppNav } from "../../src/components/AppNav";
import fixture from "./fixture.json";

const view = fixture as any;
const previewPath = window.location.pathname;
const previewTitles: Record<string, string> = { '/settings': 'Настройки', '/desktop': 'Рабочий экран', '/chats': 'Чаты', '/files': 'Документы', '/reports': 'Отчёты', '/history': 'История', '/changelog': 'Что нового', '/archive': 'Архив', '/admin': 'Администрирование', '/profile': 'Профиль', '/board/tv': 'TV-режим' };
function PreviewUnavailable() {
  return <section style={{maxWidth:680,margin:'48px auto',padding:24}}>
    <p style={{color:'var(--ds-muted)',marginBottom:12}}>Предпросмотр TASKora</p>
    <h1>{previewTitles[previewPath] ?? 'Раздел недоступен в демонстрации'}</h1>
    <p style={{lineHeight:1.7,margin:'20px 0'}}>Этот раздел не подключён к локальной демонстрации. Здесь доступны доска, список, таймлайн, «Моя работа», открытие задач и нефтебазы.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><a className="button" href="/board">Открыть доску и режимы</a><a className="button secondary" href="/oil-depots">Открыть нефтебазы</a></div>
    <p style={{color:'var(--ds-muted)',fontSize:12,lineHeight:1.6,marginTop:24}}>Данные тестовые. Сохранение задач и отправка сообщений в этой демонстрации отключены.</p>
  </section>;
}
const demoDepots: DepotSummary[] = ["Нижний Тагил", "Омская", "Челябинская", "Гладкое", "Томск", "Козулька", "Тобольск", "Кемерово", "Ноябрьск"].map((name,index)=>({name,key:"demo-"+index,owner:DEPOT_OWNERS[index%3],os:index%2 ? "Astra Linux" : "Windows",timezone:"МСК+2",equipment:"Тестовый состав: серверы АСУ ТП, операторские станции, сетевое оборудование.",matched:true,active:3+index,completed:2+index,overdue:index%3,lastActivityAt:index%2 ? "2026-09-21T09:00:00Z" : "2026-08-19T09:00:00Z",checkedAt:index%2 ? "2026-09-20T09:00:00Z" : null,checkedBy:index%2 ? DEPOT_OWNERS[index%3] : null,idleDays:index%2 ? 2 : 35,needsCheck:index%2===0,tasks:[{id:"demo-task-"+index,number:101+index,title:"Проверить резервное копирование и обновить документацию",status:"В работе",href:"/board",overdue:index%3>0}]}));

createRoot(document.getElementById("root")!).render(
  <div className="app">
    <aside className="sidebar">
      <WorkspaceBrand /><p style={{fontSize:10,color:"#c2bbeb",padding:"0 16px 12px",lineHeight:1.5}}>Демо · тестовые данные<br />Без сохранения изменений</p>
      <AppNav user={view.currentUser} />
    </aside>
    <main className="main">{window.location.pathname === "/oil-depots" ? <OilDepotDirectory depots={demoDepots} canCheck={false} /> : previewPath === "/board" || previewPath === "/" ? <BoardClient initialView={view} /> : <PreviewUnavailable />}</main>
  </div>,
);
