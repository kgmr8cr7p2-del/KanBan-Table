import { PermissionKey } from "@prisma/client";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getBoardView } from "@/lib/board-data";
import { DesktopDashboard } from "@/components/DesktopDashboard";

export default async function DesktopPage() {
  const user = await requirePermission(PermissionKey.VIEW_BOARD);
  const view = await getBoardView(user, new URLSearchParams());
  if (!view) notFound();
  return <DesktopDashboard initialView={JSON.parse(JSON.stringify(view))} userName={user.name} />;
}
