import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireVerifiedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, handleRouteError, ok } from "@/lib/http";
import { sendWebPushNotification } from "@/lib/web-push";

export async function GET() {
  try {
    const user = await requireVerifiedUser();
    const [users, notices] = await Promise.all([
      prisma.user.findMany({
        where: { approvedAt: { not: null }, id: { not: user.id } },
        select: { id: true, name: true, avatarUrl: true },
        orderBy: { name: "asc" },
      }),
      prisma.notification.findMany({
        where: {
          userId: user.id,
          type: "PRANK",
          createdAt: { gte: new Date(Date.now() - 60000) },
        },
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { id: true, title: true, body: true },
      }),
    ]);
    return ok({ users, notices });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser();
    const { recipientId } = z
      .object({ recipientId: z.string().min(1).max(80) })
      .parse(await request.json());
    const recipient = await prisma.user.findFirst({
      where: { id: recipientId, approvedAt: { not: null } },
      select: { id: true, name: true },
    });
    if (!recipient || recipient.id === user.id)
      return fail("Выберите другого участника команды", 422);
    const notice = await prisma.$transaction(async (tx) => {
      await tx.notificationDispatch.create({
        data: {
          key: `monkey:${user.id}:${Math.floor(Date.now() / 30000)}`,
          type: "monkey",
          payload: { recipientId },
        },
      });
      const notice = await tx.notification.create({
        data: {
          userId: recipientId,
          type: "PRANK",
          category: "system",
          title: "Обезьяний сюрприз",
          body: `${user.name} кинул в вас какашку. Это проделки обезьяны!`,
          href: "/notifications",
        },
      });
      await tx.taskSoundEvent.create({
        data: {
          userId: recipientId,
          kind: "prank",
          soundUrl: "/mascot/prank.mp3",
        },
      });
      return notice;
    });
    await sendWebPushNotification(recipientId, notice).catch(() => undefined);
    return ok({ sent: true, recipient: recipient.name });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return fail("Обезьяне нужен перерыв. Попробуйте через 30 секунд.", 429);
    return handleRouteError(error);
  }
}
