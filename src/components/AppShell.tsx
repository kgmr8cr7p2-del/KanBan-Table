import { KanbanSquare } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { GoidaReminder } from "@/components/GoidaReminder";
import { TaskSoundNotifier } from "@/components/TaskSoundNotifier";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <KanbanSquare size={20} />
          </span>
          <span>Team Kanban Board</span>
        </div>
        <AppNav isAdmin={user.role.name === "ADMIN"} />
      </aside>
      <main className="main">{children}</main>
      <TaskSoundNotifier />
      <GoidaReminder />
    </div>
  );
}
