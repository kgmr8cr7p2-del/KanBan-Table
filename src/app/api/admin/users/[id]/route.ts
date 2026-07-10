import { RoleName } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleRouteError, ok } from "@/lib/http";
import { userRoleSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireRole([RoleName.ADMIN]);
    const { id } = await params;
    const input = userRoleSchema.parse(await request.json());
    const role = await prisma.role.findUniqueOrThrow({ where: { name: input.role } });
    const user = await prisma.user.update({
      where: { id },
      data: { roleId: role.id },
      include: { role: true },
    });
    return ok({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
