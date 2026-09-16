import { PermissionKey } from "@prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/role-permissions";
import { prisma } from "@/lib/prisma";
import { fail, handleRouteError, ok } from "@/lib/http";
import { depotKey } from "@/lib/oil-depot-summary";
import sources from "@/data/oil-depots.json";

export async function POST(request: Request) {
  try {
    const user = await requirePermission(PermissionKey.VIEW_BOARD);
    if (!hasAnyPermission(user, [PermissionKey.CREATE_TASKS, PermissionKey.EDIT_ALL_TASKS, PermissionKey.MANAGE_WORKSPACE])) {
      return fail("Недостаточно прав для отметки проверки", 403);
    }
    const { key } = z.object({ key: z.string().max(100) }).parse(await request.json());
    if (!sources.some(d => depotKey(d.name) === key)) return fail("Нефтебаза не найдена", 404);
    const checkedAt = new Date();
    const check = await prisma.oilDepotCheck.upsert({
      where: { depotKey: key },
      create: { depotKey: key, userId: user.id, checkedAt },
      update: { userId: user.id, checkedAt },
    });
    return ok({ checkedAt: check.checkedAt.toISOString(), checkedBy: user.name });
  } catch (error) {
    return handleRouteError(error);
  }
}
