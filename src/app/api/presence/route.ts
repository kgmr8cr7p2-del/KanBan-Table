import { z } from "zod";
import { requireVerifiedUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const presenceSchema = z.object({ activity: z.string().trim().min(1).max(80) });

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser();
    const { activity } = presenceSchema.parse(await request.json());
    await prisma.user.update({
      where: { id: user.id },
      data: { currentActivity: activity, lastActiveAt: new Date() },
    });
    return ok({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
