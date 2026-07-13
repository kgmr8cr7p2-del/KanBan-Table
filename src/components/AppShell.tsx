import { KanbanSquare } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { GoidaReminder } from "@/components/GoidaReminder";
import { TaskSoundNotifier } from "@/components/TaskSoundNotifier";
import { WeeklyReportReminder } from "@/components/WeeklyReportReminder";
import { PresenceTracker } from "@/components/PresenceTracker";

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
        <AppNav user={user} />
      </aside>
      <main className="main">{children}</main>
      <TaskSoundNotifier />
      <GoidaReminder />
      <WeeklyReportReminder />
      <PresenceTracker />
    </div>
  );
}
