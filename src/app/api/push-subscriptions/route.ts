import { z } from "zod";
import { requireVerifiedUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getWebPushPublicKey } from "@/lib/web-push";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4096).refine((value) => new URL(value).protocol === "https:", "Push endpoint должен использовать HTTPS"),
  keys: z.object({
    p256dh: z.string().min(1).max(2048),
    auth: z.string().min(1).max(2048),
  }),
});

export async function GET() {
  try {
    const user = await requireVerifiedUser();
    const subscriptionCount = await prisma.pushSubscription.count({ where: { userId: user.id } });
    return ok({ publicKey: getWebPushPublicKey(), subscriptionCount });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser();
    const subscription = subscriptionSchema.parse(await request.json());
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
    return ok({ enabled: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireVerifiedUser();
    const body = await request.json().catch(() => ({}));
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
    }
    return ok({ enabled: false });
  } catch (error) {
    return handleRouteError(error);
  }
}
