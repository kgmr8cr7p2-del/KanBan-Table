import { RoleName } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleRouteError, ok } from "@/lib/http";
import { userInviteSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    await requireRole([RoleName.ADMIN]);
    const input = userInviteSchema.parse(await request.json());
    const role = await prisma.role.findUniqueOrThrow({ where: { name: input.role } });
    const existingUser = await prisma.user.findUnique({ where: { email: input.email }, include: { role: true } });

    if (existingUser) {
      const user = await prisma.user.update({
        where: { id: existingUser.id },
        data: { roleId: role.id },
        include: { role: true },
      });
      return ok({ user, invite: null });
    }

    const invite = await prisma.userInvite.upsert({
      where: { email: input.email },
      update: { roleId: role.id, acceptedAt: null },
      create: { email: input.email, roleId: role.id },
      include: { role: true },
    });

    return ok({ invite });
  } catch (error) {
    return handleRouteError(error);
  }
}
