import { requireVerifiedUser } from "@/lib/auth";
import { getLatestTaskSoundEvent } from "@/lib/task-sound-event";
import { handleRouteError, ok } from "@/lib/http";

export async function GET() {
  try {
    await requireVerifiedUser();
    return ok({ event: getLatestTaskSoundEvent() });
  } catch (error) {
    return handleRouteError(error);
  }
}
