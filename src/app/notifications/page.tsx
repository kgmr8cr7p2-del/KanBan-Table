import { PermissionKey } from "@prisma/client";
import { NotificationCenter } from "@/components/NotificationCenter";
import { requirePermission } from "@/lib/auth";

export default async function NotificationsPage() {
  await requirePermission(PermissionKey.USE_CHATS);
  return <NotificationCenter fullPage />;
}
