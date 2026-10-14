import { WorkspaceBrand } from "@/components/WorkspaceBrand";
import type { CurrentUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { GoidaReminder } from "@/components/GoidaReminder";
import { TaskSoundNotifier } from "@/components/TaskSoundNotifier";
import { NotificationSoundNotifier } from "@/components/NotificationSoundNotifier";
import { WeeklyReportReminder } from "@/components/WeeklyReportReminder";
import { PresenceTracker } from "@/components/PresenceTracker";
import { InterfaceModeSync } from "@/components/InterfaceModeSync";
import { SoundPreferenceSync } from "@/components/SoundPreferenceSync";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="app">
      <InterfaceModeSync mode="new" />
      <aside className="sidebar">
        <WorkspaceBrand />
        <AppNav user={user} />
      </aside>
      <main className="main">{children}</main>
      {user.approvedAt ? (
        <>
          <SoundPreferenceSync userId={user.id} />
          <TaskSoundNotifier />
          <NotificationSoundNotifier />
          <GoidaReminder />
          <WeeklyReportReminder />
          <PresenceTracker />
        </>
      ) : null}
    </div>
  );
}
