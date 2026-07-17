import { requireVerifiedUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireVerifiedUser();
    const params = new URL(request.url).searchParams;
    const limit = Math.min(Math.max(Number(params.get("limit") || 30), 1), 100);
    const unreadOnly = params.get("unread") === "1";
    const category = params.get("category") || "";
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id, category: category || undefined, readAt: unreadOnly ? null : undefined },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return ok({ notifications: items, unreadCount });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser();
    const body = await request.json().catch(() => ({}));
    if (body?.action === "read-all") {
      await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
      return ok({});
    }
    if (body?.action === "read-href" && typeof body.href === "string") {
      await prisma.notification.updateMany({ where: { userId: user.id, href: body.href, readAt: null }, data: { readAt: new Date() } });
      return ok({});
    }
    return fail("Неизвестное действие", 400);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireVerifiedUser();
    const result = await prisma.notification.deleteMany({ where: { userId: user.id } });
    return ok({ deletedCount: result.count });
  } catch (error) {
    return handleRouteError(error);
  }
}
