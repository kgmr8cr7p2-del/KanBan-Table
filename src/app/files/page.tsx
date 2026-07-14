import { PermissionKey } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { ImportantFilesClient } from "@/components/ImportantFilesClient";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/role-permissions";

export default async function FilesPage() {
  const user = await requirePermission(PermissionKey.VIEW_FILES);

  return (
    <AppShell user={user}>
      <ImportantFilesClient canManage={hasPermission(user, PermissionKey.MANAGE_FILES)} />
    </AppShell>
  );
}
