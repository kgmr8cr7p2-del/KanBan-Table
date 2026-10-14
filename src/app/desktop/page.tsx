import { PermissionKey } from "@prisma/client";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getBoardView } from "@/lib/board-data";
import { DesktopDashboard } from "@/components/DesktopDashboard";
import { MonkeyMascot } from "@/components/MonkeyMascot";
import { SoundPreferenceSync } from "@/components/SoundPreferenceSync";
import { TaskSoundNotifier } from "@/components/TaskSoundNotifier";

export default async function DesktopPage() {
  const user = await requirePermission(PermissionKey.VIEW_BOARD);
  const view = await getBoardView(user, new URLSearchParams());
  if (!view) notFound();
  return <><SoundPreferenceSync userId={user.id}/><TaskSoundNotifier/><MonkeyMascot userId={user.id}/><DesktopDashboard initialView={JSON.parse(JSON.stringify(view))} userName={user.name} /></>;
}
