import { PermissionKey } from "@prisma/client";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AdminUsers } from "@/components/AdminUsers";
import { RoleManager } from "@/components/RoleManager";
import { SettingsHub, type SettingsPanel } from "@/components/SettingsHub";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const user = await requirePermission(PermissionKey.MANAGE_USERS);
  const allPermissions = Object.values(PermissionKey);
  const [users, invites, roles] = await Promise.all([
    prisma.user.findMany({ include: { role: true }, orderBy: { createdAt: "desc" } }),
    prisma.userInvite.findMany({ where: { acceptedAt: null }, include: { role: true }, orderBy: { createdAt: "desc" } }),
    prisma.role.findMany({ include: { _count: { select: { users: true, userInvites: true } } }, orderBy: [{ systemKey: "asc" }, { name: "asc" }] }),
  ]);
  const normalizedRoles = roles.map((role) => role.systemKey === "ADMIN" ? { ...role, permissions: allPermissions } : role);

  return (
    <AppShell user={user}>
      <div className="content settings-page admin-settings-page">
        <header className="settings-page-head">
          <span className="settings-page-kicker"><ShieldCheck size={17} /> Администрирование Taskora</span>
          <h1>Админ-панель</h1>
          <p>Управляйте пользователями, приглашениями, ролями и правами через отдельные рабочие окна.</p>
        </header>
        <SettingsHub
          ariaLabel="Разделы администрирования"
          dialogKicker="Админ-панель Taskora"
          storageKey="admin"
          panels={[
            {
              id: "users",
              title: "Пользователи и приглашения",
              description: "Поиск по ФИО, доступ к системе и назначение ролей",
              icon: "users" as const,
              wide: true,
              content: <AdminUsers currentUserId={user.id} invites={JSON.parse(JSON.stringify(invites))} users={JSON.parse(JSON.stringify(users))} roles={JSON.parse(JSON.stringify(normalizedRoles))} />,
            },
            {
              id: "roles",
              title: "Роли и права",
              description: "Создание ролей и точная настройка разрешений",
              icon: "shield" as const,
              wide: true,
              content: <RoleManager initialRoles={JSON.parse(JSON.stringify(normalizedRoles))} />,
            },
          ] satisfies SettingsPanel[]}
        />
      </div>
    </AppShell>
  );
}
