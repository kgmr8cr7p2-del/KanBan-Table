import { requireVerifiedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleRouteError, ok } from "@/lib/http";
import { profileSchema } from "@/lib/validators";

const DEFAULT_TELEGRAM_CHAT_ID = "-5575713442";

export async function PATCH(request: Request) {
  try {
    const user = await requireVerifiedUser();
    const input = profileSchema.parse(await request.json());
    const profile = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        jobTitle: input.jobTitle,
        handle: input.handle,
        profileStatus: input.profileStatus,
      },
      select: { id: true, name: true, email: true, jobTitle: true, handle: true, profileStatus: true, avatarUrl: true },
    });
    await prisma.telegramConnection.upsert({
      where: { userId: user.id },
      update: { chatId: DEFAULT_TELEGRAM_CHAT_ID, enabled: true },
      create: { userId: user.id, chatId: DEFAULT_TELEGRAM_CHAT_ID },
    });
    return ok({ profile });
  } catch (error) {
    return handleRouteError(error);
  }
}
