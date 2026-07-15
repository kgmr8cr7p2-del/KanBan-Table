import { PermissionKey } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { roleHasPermission } from "@/lib/role-permissions";
import { roleSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requirePermission(PermissionKey.MANAGE_USERS);
    const { id } = await params;
    const input = roleSchema.parse(await request.json());
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return fail("Роль не найдена", 404);

    const nextPermissions = role.systemKey === "ADMIN" ? Object.values(PermissionKey) : input.permissions;
    const duplicate = await prisma.role.findFirst({ where: { name: input.name, id: { not: id } } });
    if (duplicate) return fail("Роль с таким названием уже существует", 409);

    const removesUserManagement = roleHasPermission(role, PermissionKey.MANAGE_USERS)
      && !nextPermissions.includes(PermissionKey.MANAGE_USERS);
    if (removesUserManagement) {
      const otherManagers = await prisma.user.count({
        where: {
          approvedAt: { not: null },
          roleId: { not: id },
          OR: [
            { role: { systemKey: "ADMIN" } },
            { role: { permissions: { has: PermissionKey.MANAGE_USERS } } },
          ],
        },
      });
      if (!otherManagers) return fail("Сначала назначьте другую роль с правом управления пользователями", 422);
    }

    const updated = await prisma.role.update({ where: { id }, data: { name: input.name, permissions: nextPermissions } });
    if (roleHasPermission(role, PermissionKey.USE_TELEGRAM) && !nextPermissions.includes(PermissionKey.USE_TELEGRAM)) {
      await prisma.telegramConnection.updateMany({ where: { user: { roleId: id } }, data: { enabled: false } });
    }
    return ok({ role: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requirePermission(PermissionKey.MANAGE_USERS);
    const { id } = await params;
    const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true, userInvites: true } } } });
    if (!role) return fail("Роль не найдена", 404);
    if (role.systemKey) return fail("Встроенную роль нельзя удалить", 422);
    if (role._count.users || role._count.userInvites) return fail("Сначала назначьте пользователям и приглашениям другую роль", 422);
    await prisma.role.delete({ where: { id } });
    return ok({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
