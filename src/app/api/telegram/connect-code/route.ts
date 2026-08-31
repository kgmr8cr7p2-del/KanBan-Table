import { PermissionKey } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { issueTelegramConnectCode } from "@/lib/telegram-connect-code";
import { handleRouteError } from "@/lib/http";

export async function POST() {
  try {
    const user = await requirePermission(PermissionKey.USE_TELEGRAM);
    const result = await issueTelegramConnectCode(user.id);
    return Response.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
