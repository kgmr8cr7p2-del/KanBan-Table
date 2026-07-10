import { RoleName } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { AdminUsers } from "@/components/AdminUsers";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const user = await requireRole([RoleName.ADMIN]);
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell user={user}>
      <div className="content">
        <section className="panel">
          <h1>Админ-панель</h1>
          <p className="muted">Управление ролями пользователей. Подтверждение email хранится в профиле пользователя.</p>
          <AdminUsers users={JSON.parse(JSON.stringify(users))} />
        </section>
      </div>
    </AppShell>
  );
}
