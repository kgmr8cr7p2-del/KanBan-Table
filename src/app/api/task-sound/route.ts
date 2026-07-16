import { requireVerifiedUser } from "@/lib/auth";
import { getRecentTaskSoundEvents } from "@/lib/task-sound-event";
import { handleRouteError, ok } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireVerifiedUser();
    const events = await getRecentTaskSoundEvents(user.id);
    return ok({ events });
  } catch (error) {
    return handleRouteError(error);
  }
}
