import { requireVerifiedUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const preferenceSelect = {
  browserChat: true,
  browserMentions: true,
  browserTasks: true,
  browserDeadlines: true,
  browserSystem: true,
} as const;

export async function GET() {
  try {
    const user = await requireVerifiedUser();
    const preferences = await getOrCreatePreferences(user.id);
    return ok({ preferences });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireVerifiedUser();
    const body = await request.json().catch(() => ({}));
    const data = {
      browserChat: booleanOrUndefined(body.browserChat),
      browserMentions: booleanOrUndefined(body.browserMentions),
      browserTasks: booleanOrUndefined(body.browserTasks),
      browserDeadlines: booleanOrUndefined(body.browserDeadlines),
      browserSystem: booleanOrUndefined(body.browserSystem),
    };
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...definedOnly(data) },
      update: definedOnly(data),
      select: preferenceSelect,
    });
    return ok({ preferences });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function getOrCreatePreferences(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: preferenceSelect,
  });
}

function booleanOrUndefined(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function definedOnly<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}
