import { ReportsPanel, GlobalHistory } from "../../src/components/BoardInsights";
import { SettingsHub } from "../../src/components/SettingsHub";
import { BoardSettings } from "../../src/components/BoardSettings";
import { OilDepotSettings } from "../../src/components/OilDepotSettings";
import { ChatHub } from "../../src/components/ChatHub";
import { ImportantFilesClient } from "../../src/components/ImportantFilesClient";
import { ArchiveBrowser } from "../../src/components/ArchiveBrowser";
import fixture from "./fixture.json";

const view = fixture as any;
const tasks = view.board.columns.flatMap((column: any) => column.tasks);
const columns = view.board.columns.map((column: any) => column.name);
const rows = view.oilDepots.map((depot: any) => ({ name: depot.name, total: tasks.filter((task: any) => task.oilDepot?.id === depot.id).length, statuses: view.board.columns.map((column: any) => ({name: column.name, count: column.tasks.filter((task: any) => task.oilDepot?.id === depot.id).length})) }));
const reports = {
  byOilDepotStatus: { columns, rows },
  period: { closedByOilDepot: rows.map((row: any) => ({name: row.name, count: 2})) },
  chart: Array.from({length:12}, (_, index) => ({label: `${index + 1}.2026`, created: index + 2, completed: index % 4, overdue: index % 3})),
};

export function PreviewSection({path}: {path: string}) {
  if(path === "/reports") return <div className="content insights-page"><section className="page-heading reports-page-heading"><h1>Дашборд</h1><a className="button secondary" href="#">Экспорт в Excel</a></section><form className="reports-filter panel" onSubmit={event=>event.preventDefault()}><label className="field"><span className="label">Год</span><select className="select"><option>2026</option></select></label>{["С даты","До даты"].map(label=><label className="field" key={label}><span className="label">{label}</span><input className="input" type="date" defaultValue="2026-01-01" /></label>)}<div className="reports-period-actions">{["Неделя","Месяц","Квартал","Год"].map(label=><a href="#" key={label}>{label}</a>)}</div><button className="button">Показать</button><a className="button secondary" href="#">Текущий год</a></form><ReportsPanel reports={reports}/></div>;
  if(path === "/history") return <div className="content insights-page"><section className="page-heading"><h1>Общая история</h1></section><form className="history-filter panel" onSubmit={event=>event.preventDefault()}>{["С даты","До даты"].map(label=><label className="field" key={label}><span className="label">{label}</span><input className="input" type="date" defaultValue="2026-01-01"/></label>)}{["Пользователь","Нефтебаза","Действие"].map(label=><label className="field" key={label}><span className="label">{label}</span><select className="select"><option>{label}</option></select></label>)}<button className="button">Показать</button></form><GlobalHistory logs={tasks.slice(0,8).map((task: any,index: number)=>({id:`log-${index}`,createdAt:"2026-10-14T09:00:00Z",action:"TASK_CREATED",task,user:view.users[0],details:{}}))}/></div>;
  if(path === "/archive") return <div className="content insights-page"><section className="page-heading"><h1>Архив задач</h1></section><ArchiveBrowser tasks={tasks.slice(0,5).map((task: any)=>({...task,archivedAt:"2026-10-14T09:00:00Z",archivedBy:view.users[0]}))}/></div>;
  if(path === "/chats") return <div className="content chats-page"><header className="chats-page-head"><h1>Чаты</h1></header><ChatHub viewerId={view.currentUser.id}/></div>;
  if(path === "/files") return <ImportantFilesClient canManage={true}/>;
  return <div className="content settings-page"><header className="settings-page-head"><h1>Настройки Taskora</h1></header><SettingsHub panels={[
    {id:"board", title:"Рабочая доска",description:"Колонки и параметры выбранной доски",icon:"database",wide:true,content:<BoardSettings columns={view.board.columns} boardId={view.board.id} boardName={view.board.name} boards={view.availableBoards} canManage={true}/>},
    {id:"depots",title:"Нефтебазы",description:"Справочник объектов рабочего пространства",icon:"building",content:<OilDepotSettings oilDepots={view.oilDepots} canManage={true}/>},
  ]}/></div>;
}
