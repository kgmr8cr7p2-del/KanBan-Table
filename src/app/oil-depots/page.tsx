import { PermissionKey } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { OilDepotDirectory } from "@/components/OilDepotDirectory";
import { requirePermission } from "@/lib/auth";
import { getOilDepotDashboard } from "@/lib/oil-depot-dashboard";
import { hasAnyPermission } from "@/lib/role-permissions";

export default async function OilDepotsPage() {
  const user = await requirePermission(PermissionKey.VIEW_BOARD);
  const depots = await getOilDepotDashboard();
  const canCheck = hasAnyPermission(user, [PermissionKey.CREATE_TASKS, PermissionKey.EDIT_ALL_TASKS, PermissionKey.MANAGE_WORKSPACE]);
  return <AppShell user={user}><OilDepotDirectory depots={depots} canCheck={canCheck} /></AppShell>;
}
