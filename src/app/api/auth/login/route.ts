import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { role: true },
    });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return fail("Неверная почта или пароль", 401);
    }

    await createSession(user.id);
    return ok({ ok: true, verified: Boolean(user.emailVerifiedAt) });
  } catch (error) {
    return handleRouteError(error);
  }
}
