type MapSourceTask = {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  deadline: Date | string | null;
  parentId: string | null;
  assigneeId: string | null;
  oilDepotId: string | null;
  oilDepot: { id: string; name: string } | null;
  assignees: Array<{ userId: string }>;
  checklists: Array<{ id: string; title: string; items: Array<{ id: string; text: string; completed: boolean }> }>;
};

export function projectTaskForMap(task: MapSourceTask, columnName: string) {
  return {
    id: task.id, taskNumber: task.taskNumber, title: task.title, description: task.description,
    deadline: task.deadline, parentId: task.parentId, assigneeId: task.assigneeId,
    oilDepotId: task.oilDepotId, oilDepot: task.oilDepot ? { id: task.oilDepot.id, name: task.oilDepot.name } : null,
    assignees: task.assignees.map((item) => ({ userId: item.userId })),
    column: { name: columnName },
    checklists: task.checklists.map((list) => ({ id: list.id, title: list.title, items: list.items.map((item) => ({ id: item.id, text: item.text, completed: item.completed })) })),
  };
}
