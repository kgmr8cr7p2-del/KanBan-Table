import { PermissionKey } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { OilDepotDirectory } from "@/components/OilDepotDirectory";
import { requirePermission } from "@/lib/auth";
import depots from "@/data/oil-depots.json";

export default async function OilDepotsPage() {
  const user = await requirePermission(PermissionKey.VIEW_BOARD);
  return <AppShell user={user}><OilDepotDirectory depots={depots} /></AppShell>;
}
