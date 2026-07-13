UPDATE "Board"
SET "name" = 'Taskora'
WHERE "id" = 'default-board'
  AND "name" IN ('Такт', 'Team Kanban Board');
